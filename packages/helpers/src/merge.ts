import type { ExcalidrawElement } from "./types.js";

function versionOf(el: ExcalidrawElement): number {
  return el.version ?? 0;
}

function nonceOf(el: ExcalidrawElement): number {
  return typeof el.versionNonce === "number" ? el.versionNonce : 0;
}

function isTombstone(el: ExcalidrawElement): boolean {
  return el.isDeleted === true;
}

/**
 * Whether the remote copy of an element replaces the local one. Same rule as Excalidraw's
 * `reconcileElements`: the higher version wins, and on equal versions the lower `versionNonce`,
 * so every replica settles on the same copy whatever order the updates arrive in.
 */
export function remoteWins(local: ExcalidrawElement, remote: ExcalidrawElement): boolean {
  if (versionOf(local) !== versionOf(remote)) return versionOf(remote) > versionOf(local);
  return nonceOf(remote) <= nonceOf(local);
}

function compareFractionalIndex(a: ExcalidrawElement, b: ExcalidrawElement): number {
  const ai = a.index as string;
  const bi = b.index as string;
  if (ai !== bi) return ai < bi ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Excalidraw orders the scene by fractional `index`, as its own reconcile does. Elements saved
 * before indices existed have none, and then the array order is all there is to keep.
 */
function inFractionalOrder(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  if (!elements.every((e) => typeof e.index === "string")) return elements;
  return elements.sort(compareFractionalIndex);
}

function byId(elements: readonly unknown[]): Map<string, ExcalidrawElement> {
  const map = new Map<string, ExcalidrawElement>();
  for (const el of elements) {
    const e = el as ExcalidrawElement;
    if (e.id) map.set(e.id, e);
  }
  return map;
}

/**
 * Merge remote elements with local elements at the element level: for each element the copy
 * `remoteWins` picks, plus the elements only one side has. Remote order is kept unless every
 * element carries a fractional index.
 */
export function mergeElements(
  localElements: readonly unknown[],
  remoteElements: unknown[],
): unknown[] {
  const localMap = byId(localElements);
  const seen = new Set<string>();
  const merged: ExcalidrawElement[] = [];

  for (const el of remoteElements) {
    const remote = el as ExcalidrawElement;
    if (!remote.id || seen.has(remote.id)) continue;
    seen.add(remote.id);
    const local = localMap.get(remote.id);
    merged.push(local && !remoteWins(local, remote) ? local : remote);
  }

  for (const el of localElements) {
    const e = el as ExcalidrawElement;
    if (e.id && !seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }

  return inFractionalOrder(merged);
}

/**
 * Delta result from diffElements.
 */
export interface ElementDelta {
  changed: ExcalidrawElement[];
  removedIds: string[];
}

/**
 * Compute the delta between a previous and current element array.
 * Returns changed/new elements and IDs of removed elements.
 */
export function diffElements(prev: readonly unknown[], current: readonly unknown[]): ElementDelta {
  const prevMap = new Map<string, ExcalidrawElement>();
  for (const el of prev) {
    const e = el as ExcalidrawElement;
    if (e.id) prevMap.set(e.id, e);
  }

  const currentMap = new Map<string, ExcalidrawElement>();
  const changed: ExcalidrawElement[] = [];

  for (const el of current) {
    const e = el as ExcalidrawElement;
    if (!e.id) continue;
    currentMap.set(e.id, e);
    const old = prevMap.get(e.id);
    if (!old || (e.version ?? 0) !== (old.version ?? 0)) {
      changed.push(e);
    }
  }

  const removedIds: string[] = [];
  for (const [id] of prevMap) {
    if (!currentMap.has(id)) {
      removedIds.push(id);
    }
  }

  return { changed, removedIds };
}

/**
 * Apply a delta (changed elements + removed IDs) to a local element array.
 * - Delete wins: if an ID is in removedIds, it's removed regardless of version.
 * - For changed elements, `remoteWins` decides.
 * - Cleans up orphaned bindings (arrows pointing to deleted elements)
 *   and orphaned groupIds, on copies: the input elements are never modified.
 *
 * Returns: { elements, conflictIds, deletedIds }
 * - conflictIds: elements in `editedIds` (edited locally, not yet saved) that a different
 *   remote copy replaced
 * - deletedIds: element IDs that were removed by the delta
 */
export function mergeDelta(
  localElements: readonly unknown[],
  changed: readonly unknown[],
  removedIds: readonly string[],
  editedIds: ReadonlySet<string> = new Set(),
): { elements: unknown[]; conflictIds: string[]; deletedIds: string[] } {
  const removedSet = new Set(removedIds);
  const changedMap = byId(changed);

  const conflictIds: string[] = [];
  const deletedIds: string[] = [];
  const merged: ExcalidrawElement[] = [];

  for (const el of localElements) {
    const local = el as ExcalidrawElement;
    if (!local.id) continue;

    // Delete wins
    if (removedSet.has(local.id)) {
      deletedIds.push(local.id);
      continue;
    }

    const remote = changedMap.get(local.id);
    changedMap.delete(local.id);
    if (remote && isTombstone(remote) && !isTombstone(local) && editedIds.has(local.id)) {
      // ADR-022: a delete wins over an edit made concurrently with it. Excalidraw deletes by
      // marking the element, so without this the deleter and the editor just trade versions;
      // bumping past both settles every replica on the delete.
      merged.push(
        remoteWins(local, remote)
          ? remote
          : { ...remote, version: Math.max(versionOf(local), versionOf(remote)) + 1 },
      );
      deletedIds.push(local.id);
    } else if (remote && remoteWins(local, remote)) {
      const replaced = versionOf(remote) !== versionOf(local) || nonceOf(remote) !== nonceOf(local);
      if (replaced && editedIds.has(local.id)) conflictIds.push(local.id);
      merged.push(remote);
    } else {
      merged.push(local);
    }
  }

  for (const el of changedMap.values()) {
    if (!removedSet.has(el.id)) merged.push(el);
  }

  const elements = deletedIds.length > 0 ? withoutOrphans(merged) : merged;
  return { elements: inFractionalOrder(elements), conflictIds, deletedIds };
}

/**
 * Arrows bound to a deleted element lose that binding, and groups left with fewer than two
 * members dissolve. Each changed element is a new object one version up; its nonce and
 * timestamp stay, so every replica running the same cleanup produces the identical copy.
 */
function withoutOrphans(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  const survivingIds = new Set(elements.map((e) => e.id));

  const groupCounts = new Map<string, number>();
  for (const el of elements) {
    for (const gid of el.groupIds ?? []) {
      groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1);
    }
  }
  const orphanedGroups = new Set(
    [...groupCounts].filter(([, count]) => count < 2).map(([gid]) => gid),
  );

  return elements.map((el) => {
    const dropStart = !!el.startBinding && !survivingIds.has(el.startBinding.elementId);
    const dropEnd = !!el.endBinding && !survivingIds.has(el.endBinding.elementId);
    const groupIds = el.groupIds?.filter((gid) => !orphanedGroups.has(gid));
    const dropGroups = groupIds !== undefined && groupIds.length !== el.groupIds?.length;
    if (!dropStart && !dropEnd && !dropGroups) return el;

    const cleaned: ExcalidrawElement = { ...el, version: versionOf(el) + 1 };
    if (dropStart) cleaned.startBinding = undefined;
    if (dropEnd) cleaned.endBinding = undefined;
    if (dropGroups) cleaned.groupIds = groupIds;
    return cleaned;
  });
}

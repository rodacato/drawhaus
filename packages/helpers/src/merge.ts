import type { ExcalidrawElement } from "./types.js";

/**
 * Merge remote elements with local elements at the element level.
 * For each element, keep whichever has the higher version.
 * Preserves local in-progress edits while accepting remote changes
 * for elements the local user hasn't touched.
 *
 * Iterates the remote array directly (instead of a Map) to preserve
 * the canonical element order — critical for z-index, arrow bindings,
 * and group relationships in Excalidraw.
 */
export function mergeElements(
  localElements: readonly unknown[],
  remoteElements: unknown[],
): unknown[] {
  const localMap = new Map<string, ExcalidrawElement>();
  for (const el of localElements) {
    const e = el as ExcalidrawElement;
    if (e.id) localMap.set(e.id, e);
  }

  const seen = new Set<string>();
  const merged: ExcalidrawElement[] = [];

  // Walk remote array in order — preserves canonical z-order
  for (const el of remoteElements) {
    const remote = el as ExcalidrawElement;
    if (!remote.id) continue;
    seen.add(remote.id);
    const local = localMap.get(remote.id);
    if (local && (local.version ?? 0) >= (remote.version ?? 0)) {
      merged.push(local);
    } else {
      merged.push(remote);
    }
  }

  // Append local-only elements (newly created by the local user)
  for (const el of localElements) {
    const e = el as ExcalidrawElement;
    if (e.id && !seen.has(e.id)) {
      merged.push(e);
    }
  }

  return merged;
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
export function diffElements(
  prev: readonly unknown[],
  current: readonly unknown[],
): ElementDelta {
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
 * - For changed elements, higher version wins.
 * - Cleans up orphaned bindings (arrows pointing to deleted elements)
 *   and orphaned groupIds.
 *
 * Returns: { elements, conflictIds, deletedIds }
 * - conflictIds: element IDs where the remote version overwrote a local edit
 * - deletedIds: element IDs that were removed by the delta
 */
export function mergeDelta(
  localElements: readonly unknown[],
  changed: readonly unknown[],
  removedIds: readonly string[],
): { elements: unknown[]; conflictIds: string[]; deletedIds: string[] } {
  const removedSet = new Set(removedIds);

  // Build map of incoming changes
  const changedMap = new Map<string, ExcalidrawElement>();
  for (const el of changed) {
    const e = el as ExcalidrawElement;
    if (e.id) changedMap.set(e.id, e);
  }

  const conflictIds: string[] = [];
  const deletedIds: string[] = [];
  const merged: ExcalidrawElement[] = [];
  const survivingIds = new Set<string>();

  for (const el of localElements) {
    const local = el as ExcalidrawElement;
    if (!local.id) continue;

    // Delete wins
    if (removedSet.has(local.id)) {
      deletedIds.push(local.id);
      continue;
    }

    const remote = changedMap.get(local.id);
    if (remote) {
      changedMap.delete(local.id);
      if ((remote.version ?? 0) > (local.version ?? 0)) {
        // Remote wins — check if local had edits (conflict)
        if ((local.version ?? 0) > 0) {
          conflictIds.push(local.id);
        }
        merged.push(remote);
        survivingIds.add(remote.id);
      } else {
        merged.push(local);
        survivingIds.add(local.id);
      }
    } else {
      merged.push(local);
      survivingIds.add(local.id);
    }
  }

  // Append new elements from delta (not seen locally)
  for (const [, el] of changedMap) {
    merged.push(el);
    survivingIds.add(el.id);
  }

  // Cleanup orphaned bindings and groupIds
  if (deletedIds.length > 0) {
    cleanupOrphanedBindings(merged, survivingIds);
  }

  return { elements: merged, conflictIds, deletedIds };
}

/**
 * Clean up arrows with bindings to deleted elements,
 * and groupIds referencing groups that no longer have enough members.
 */
function cleanupOrphanedBindings(
  elements: ExcalidrawElement[],
  survivingIds: Set<string>,
): void {
  for (const el of elements) {
    // Clean arrow bindings pointing to deleted elements
    if (el.startBinding && !survivingIds.has(el.startBinding.elementId)) {
      el.startBinding = undefined;
    }
    if (el.endBinding && !survivingIds.has(el.endBinding.elementId)) {
      el.endBinding = undefined;
    }
  }

  // Clean orphaned groupIds — groups with <2 members
  const groupCounts = new Map<string, number>();
  for (const el of elements) {
    if (el.groupIds) {
      for (const gid of el.groupIds) {
        groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1);
      }
    }
  }
  const orphanedGroups = new Set<string>();
  for (const [gid, count] of groupCounts) {
    if (count < 2) orphanedGroups.add(gid);
  }
  if (orphanedGroups.size > 0) {
    for (const el of elements) {
      if (el.groupIds) {
        el.groupIds = el.groupIds.filter((gid) => !orphanedGroups.has(gid));
      }
    }
  }
}

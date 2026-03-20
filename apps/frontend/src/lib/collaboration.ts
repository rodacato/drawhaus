import type { ExcalidrawElement } from "./types";

export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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
  remoteElements: unknown[]
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

export const THROTTLE_MS = 50;
export const THROTTLE_MS_HEAVY = 100;
export const HEAVY_ELEMENT_THRESHOLD = 200;
export const CURSOR_THROTTLE_MS = 30;
export const VIEWPORT_THROTTLE_MS = 100;
export const SAVE_DEBOUNCE_MS = 1200;

/** Return a higher throttle interval when the scene has many elements. */
export function getAdaptiveThrottleMs(elementCount: number): number {
  return elementCount > HEAVY_ELEMENT_THRESHOLD ? THROTTLE_MS_HEAVY : THROTTLE_MS;
}

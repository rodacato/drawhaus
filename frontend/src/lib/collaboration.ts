import type { ExcalidrawElement } from "./types";

export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Merge remote elements with local elements at the element level.
 * For each element, keep whichever has the higher version.
 * Preserves local in-progress edits while accepting remote changes
 * for elements the local user hasn't touched.
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

  const remoteMap = new Map<string, ExcalidrawElement>();
  for (const el of remoteElements) {
    const e = el as ExcalidrawElement;
    if (e.id) remoteMap.set(e.id, e);
  }

  const merged = new Map<string, ExcalidrawElement>();

  for (const [id, remote] of remoteMap) {
    const local = localMap.get(id);
    if (local && (local.version ?? 0) >= (remote.version ?? 0)) {
      merged.set(id, local);
    } else {
      merged.set(id, remote);
    }
  }

  for (const [id, local] of localMap) {
    if (!remoteMap.has(id)) {
      merged.set(id, local);
    }
  }

  return Array.from(merged.values());
}

export const THROTTLE_MS = 50;
export const CURSOR_THROTTLE_MS = 30;
export const SAVE_DEBOUNCE_MS = 1200;

// Re-export merge utilities from shared package
export { mergeElements, mergeDelta, diffElements } from "@drawhaus/helpers";

export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

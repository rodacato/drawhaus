export type { DiagramTheme, ShapeStyle, TextStyle, ArrowStyle, StrokeStyle } from "./types.js";
export { DEFAULT_THEME } from "./default.js";

import type { DiagramTheme } from "./types.js";
import { DEFAULT_THEME } from "./default.js";

/**
 * Merge a partial theme with the default theme.
 * Supports deep partial overrides at the property level.
 */
export function resolveTheme(partial?: Partial<DiagramTheme>): DiagramTheme {
  if (!partial) return DEFAULT_THEME;

  const result = { ...DEFAULT_THEME };

  for (const key of Object.keys(partial) as (keyof DiagramTheme)[]) {
    const override = partial[key];
    if (override !== undefined) {
      // Deep merge: spread the default style object, then the override
      result[key] = { ...result[key], ...override } as never;
    }
  }

  return result;
}

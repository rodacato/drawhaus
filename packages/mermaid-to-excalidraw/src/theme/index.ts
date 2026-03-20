export type { MermaidTheme, ShapeStyle, TextStyle, ArrowStyle, StrokeStyle } from "./types.js";
export { DEFAULT_THEME } from "./default.js";

import type { MermaidTheme } from "./types.js";
import { DEFAULT_THEME } from "./default.js";

/**
 * Merge a partial theme with the default theme.
 */
export function resolveTheme(partial?: Partial<MermaidTheme>): MermaidTheme {
  if (!partial) return DEFAULT_THEME;

  const result = { ...DEFAULT_THEME };

  for (const key of Object.keys(partial) as (keyof MermaidTheme)[]) {
    const override = partial[key];
    if (override !== undefined) {
      result[key] = { ...result[key], ...override } as never;
    }
  }

  return result;
}

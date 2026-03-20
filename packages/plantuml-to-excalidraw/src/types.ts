// ── Element skeleton type ──────────────────────────────────────
// Subset mínimo compatible con @excalidraw/excalidraw's convertToExcalidrawElements().
// Defined locally to avoid depending on @excalidraw/excalidraw.

export type ExcalidrawElementSkeleton = {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  points?: number[][];
  strokeStyle?: string;
  backgroundColor?: string;
  fontSize?: number;
  textAlign?: string;
  label?: { text: string; x?: number; y?: number; fontSize?: number };
  roundness?: { type: number; value?: number } | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  start?: { id: string };
  end?: { id: string };
  [key: string]: unknown;
};

// ── Config ─────────────────────────────────────────────────────

export interface PlantUMLConfig {
  /** Base font size for elements. Default: 16 */
  fontSize?: number;
}

// ── Result ─────────────────────────────────────────────────────

import type { DiagramType } from "./parser/types.js";

export interface PlantUMLToExcalidrawResult {
  /** Element skeletons ready for convertToExcalidrawElements() */
  elements: ExcalidrawElementSkeleton[];
  /** Binary files (embedded images). Always undefined for now. */
  files?: Record<string, { mimeType: string; dataURL: string }>;
  /** Detected diagram type */
  diagramType: DiagramType;
}

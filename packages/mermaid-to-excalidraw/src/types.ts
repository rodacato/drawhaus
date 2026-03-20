/** Excalidraw element skeleton — matches @excalidraw/excalidraw's transform input. */
export interface ExcalidrawElementSkeleton {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  points?: number[][];
  strokeStyle?: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  fontSize?: number;
  textAlign?: string;
  label?: { text: string; x?: number; y?: number; fontSize?: number };
  roundness?: { type: number; value?: number } | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  start?: { id: string };
  end?: { id: string };
  groupIds?: string[];
  fillStyle?: string;
  [key: string]: unknown;
}

export type BinaryFiles = Record<string, { mimeType: string; id: string; dataURL: string }>;

export interface MermaidToExcalidrawResult {
  elements: ExcalidrawElementSkeleton[];
  files?: BinaryFiles;
  /** Detected diagram type (e.g. "flowchart", "classDiagram", "sequence"). */
  diagramType: string;
}

export interface MermaidConfig {
  startOnLoad?: boolean;
  flowchart?: { curve?: "linear" | "basis" };
  themeVariables?: { fontSize?: string };
  maxEdges?: number;
  maxTextSize?: number;
}

/** A converter function that transforms a Mermaid definition into Excalidraw elements. */
export type DiagramConverter = (
  definition: string,
  config?: MermaidConfig,
) => Promise<MermaidToExcalidrawResult>;

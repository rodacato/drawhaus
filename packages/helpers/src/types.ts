export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid" | "hachure" | "cross-hatch";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  roundness: { type: number; value?: number } | null;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  // Arrow/Line-specific
  points?: Array<[number, number]>;
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  startBinding?: { elementId: string; focus: number; gap: number };
  endBinding?: { elementId: string; focus: number; gap: number };
  // Label (for arrows/rectangles)
  label?: { text: string; x: number; y: number };
  // Versioning
  version?: number;
  // Grouping
  groupIds?: string[];
  // Deletion marker (for concurrent editing)
  isDeleted?: boolean;
  // Allow extra fields
  [key: string]: unknown;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

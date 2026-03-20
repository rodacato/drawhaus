/** AST types for Mermaid mindmap diagrams. */

export type MindmapShape =
  | "default"
  | "square"
  | "rounded"
  | "circle"
  | "bang"
  | "cloud"
  | "hexagon";

export interface MindmapNode {
  id: string;
  label: string;
  shape: MindmapShape;
  level: number;
  children: MindmapNode[];
  icon?: string;
}

export interface MindmapAST {
  root: MindmapNode | null;
}

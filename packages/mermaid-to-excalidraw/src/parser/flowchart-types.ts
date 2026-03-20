// ── Mermaid Flowchart AST ──────────────────────────────────────

export type Direction = "TB" | "TD" | "BT" | "LR" | "RL";

export type NodeShape =
  | "rectangle"    // A[text]
  | "rounded"      // A(text)
  | "stadium"      // A([text])
  | "subroutine"   // A[[text]]
  | "database"     // A[(text)]
  | "circle"       // A((text))
  | "diamond"      // A{text}
  | "asymmetric"   // A>text]
  | "hexagon"      // A{{text}}
  | "parallelogram" // A[/text/]
  | "trapezoid";    // A[/text\]

export interface FlowNode {
  id: string;
  label: string;
  shape: NodeShape;
}

export type EdgeStyle = "solid" | "dotted" | "thick";

export interface FlowEdge {
  sourceId: string;
  targetId: string;
  label: string | null;
  style: EdgeStyle;
  hasArrow: boolean;
}

export interface SubGraph {
  id: string;
  label: string;
  nodeIds: string[];
  /** Nested subgraph IDs */
  childSubGraphIds: string[];
}

export interface FlowchartAST {
  direction: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  subGraphs: SubGraph[];
}

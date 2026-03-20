export type StrokeStyle = "solid" | "dashed" | "dotted";

/** Style for a shape (rectangle, ellipse, etc.) */
export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeStyle: StrokeStyle;
}

/** Style for text elements */
export interface TextStyle {
  color: string;
  fontSize: number;
}

/** Style for arrows / lines */
export interface ArrowStyle {
  stroke: string;
  strokeWidth: number;
}

/** Complete theme definition for Mermaid diagrams. */
export interface MermaidTheme {
  // ── Class Diagram ──────────────────────────────
  class: ShapeStyle;
  abstractClass: ShapeStyle;
  interface: ShapeStyle;
  enumeration: ShapeStyle;

  // ── Flowchart ─────────────────────────────────
  flowNode: ShapeStyle;
  flowDecision: ShapeStyle;
  flowDatabase: ShapeStyle;
  flowCircle: ShapeStyle;
  flowSubgraph: ShapeStyle;

  // ── Sequence Diagram ─────────────────────────────
  seqParticipant: ShapeStyle;
  seqActor: ShapeStyle;
  seqActivation: ShapeStyle;
  seqNote: ShapeStyle;
  seqLoop: ShapeStyle;
  seqMessage: ArrowStyle;
  seqDashedMessage: ArrowStyle;
  seqLifeline: ArrowStyle;

  // ── Mindmap ────────────────────────────────────
  mindmapRoot: ShapeStyle;
  mindmapNode: ShapeStyle;
  mindmapLeaf: ShapeStyle;
  mindmapBranch: ArrowStyle;

  // ── State Diagram ──────────────────────────────
  stateNode: ShapeStyle;
  stateStart: ShapeStyle;
  stateEnd: ShapeStyle;
  stateChoice: ShapeStyle;
  stateForkJoin: ShapeStyle;
  stateComposite: ShapeStyle;
  stateNote: ShapeStyle;
  stateTransition: ArrowStyle;

  // ── ER Diagram ──────────────────────────────────
  erEntity: ShapeStyle;
  erRelation: ArrowStyle;
  erDashedRelation: ArrowStyle;

  // ── Relations ──────────────────────────────────
  arrow: ArrowStyle;
  dependencyArrow: ArrowStyle;
  thickArrow: ArrowStyle;

  // ── Typography ─────────────────────────────────
  headerText: TextStyle;
  memberText: TextStyle;
  stereotypeText: TextStyle;
  labelText: TextStyle;
  nodeText: TextStyle;

  // ── Separators / Lines ─────────────────────────
  separator: ArrowStyle;
}

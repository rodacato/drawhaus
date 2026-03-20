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

  // ── Relations ──────────────────────────────────
  arrow: ArrowStyle;
  dependencyArrow: ArrowStyle;

  // ── Typography ─────────────────────────────────
  headerText: TextStyle;
  memberText: TextStyle;
  stereotypeText: TextStyle;
  labelText: TextStyle;

  // ── Separators / Lines ─────────────────────────
  separator: ArrowStyle;
}

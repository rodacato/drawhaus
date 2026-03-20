// ── Theme Types ─────────────────────────────────────────────────
//
// A DiagramTheme controls colors and stroke styles for all rendered
// elements. Each converter reads from the theme instead of hardcoding
// colors, making the visual output fully customizable.
//
// To create a custom theme, spread the default theme and override
// only the properties you need:
//
//   import { DEFAULT_THEME } from "./default.js";
//   const myTheme: DiagramTheme = {
//     ...DEFAULT_THEME,
//     class: { ...DEFAULT_THEME.class, fill: "#dbeafe" },
//   };

export type StrokeStyle = "solid" | "dashed" | "dotted";

/** Style for a shape (rectangle, ellipse, etc.) */
export interface ShapeStyle {
  /** Fill / background color */
  fill: string;
  /** Border color */
  stroke: string;
  /** Border style */
  strokeStyle: StrokeStyle;
}

/** Style for text elements */
export interface TextStyle {
  /** Text color */
  color: string;
  /** Font size in px */
  fontSize: number;
}

/** Style for arrows / lines */
export interface ArrowStyle {
  /** Stroke color */
  stroke: string;
  /** Stroke width in px */
  strokeWidth: number;
}

/** Complete theme definition for all diagram types. */
export interface DiagramTheme {
  // ── Class Diagram ──────────────────────────────
  class: ShapeStyle;
  abstractClass: ShapeStyle;
  interface: ShapeStyle;
  enum: ShapeStyle;

  // ── Object Diagram ─────────────────────────────
  object: ShapeStyle;
  map: ShapeStyle;

  // ── Use Case Diagram ──────────────────────────
  actor: ShapeStyle;
  useCase: ShapeStyle;
  boundary: ShapeStyle;

  // ── Deployment Diagram ─────────────────────────
  deploymentNode: ShapeStyle;
  deploymentContainer: ShapeStyle;
  deploymentArtifact: ShapeStyle;
  deploymentDatabase: ShapeStyle;

  // ── Component Diagram ──────────────────────────
  component: ShapeStyle;
  componentContainer: ShapeStyle;
  componentInterface: ShapeStyle;

  // ── State Diagram ───────────────────────────────
  state: ShapeStyle;
  compositeState: ShapeStyle;
  startEnd: ShapeStyle;
  choiceState: ShapeStyle;
  forkJoin: ShapeStyle;

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

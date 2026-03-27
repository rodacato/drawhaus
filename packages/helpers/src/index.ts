// Element builders
export {
  createRect,
  createText,
  createArrow,
  createLine,
  createDiamond,
  createEllipse,
  resetIdCounter,
} from "./elements.js";

// Layout engine
export {
  layoutGraph,
  type LayoutNode,
  type LayoutEdge,
  type NodePosition,
  type EdgePosition,
  type LayoutResult,
} from "./layout.js";

// Arrow routing
export { clampToBoxBorder, buildArrowPoints } from "./arrows.js";

// Defaults and styles
export { DIAGRAM_STYLES, type DiagramType } from "./defaults.js";

// Validator
export {
  validateElements,
  normalizeElements,
  type ValidationError,
  type ValidationResult,
} from "./validator.js";

// Spec
export { EXCALIDRAW_SPEC, getSpecForPrompt } from "./spec.js";

// Merge utilities
export {
  mergeElements,
  mergeDelta,
  diffElements,
  type ElementDelta,
} from "./merge.js";

// Types
export type { ExcalidrawElement, Box } from "./types.js";

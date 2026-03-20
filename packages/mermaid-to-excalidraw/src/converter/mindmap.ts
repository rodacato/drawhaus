/**
 * Mermaid Mindmap → Excalidraw elements converter.
 *
 * Uses a horizontal tree layout (root left, children right).
 * Each node's absolute position is computed in a single recursive pass,
 * then a second pass renders shapes and branch lines.
 */

import type {
  ExcalidrawElementSkeleton,
  MermaidConfig,
  MermaidToExcalidrawResult,
} from "../types.js";
import type {
  MindmapAST,
  MindmapNode,
  MindmapShape,
} from "../parser/mindmap-types.js";
import type { MermaidTheme, ShapeStyle } from "../theme/types.js";
import { DEFAULT_THEME } from "../theme/default.js";
import { parseMermaidMindmap } from "../parser/mindmap.js";
import {
  createRect,
  createLine,
  createEllipse,
  createDiamond,
  resetIdCounter,
} from "../elements.js";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9;
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;
const MIN_NODE_WIDTH = 80;
const MIN_NODE_HEIGHT = 36;
const SIBLING_GAP = 16;
const LEVEL_GAP = 60;

// ── Laid-out node (absolute positions) ──────────────────────────

interface LaidOutNode {
  node: MindmapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LaidOutNode[];
}

// ── Public API ──────────────────────────────────────────────────

export async function convertMindmap(
  definition: string,
  _config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  resetIdCounter();

  const ast = parseMermaidMindmap(definition);
  const elements = mapMindmap(ast, DEFAULT_THEME);

  return {
    elements,
    diagramType: "mindmap",
  };
}

export function mapMindmap(
  ast: MindmapAST,
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  if (!ast.root) return [];

  // Phase 1: Measure all nodes
  const sizes = new Map<string, { width: number; height: number }>();
  measureAll(ast.root, sizes);

  // Phase 2: Compute subtree heights (bottom-up)
  const subtreeHeights = new Map<string, number>();
  computeSubtreeHeight(ast.root, sizes, subtreeHeights);

  // Phase 3: Layout with absolute coordinates
  const root = layoutAbsolute(ast.root, 0, 0, 0, sizes, subtreeHeights);

  // Phase 4: Render
  const skeletons: ExcalidrawElementSkeleton[] = [];
  renderNode(root, null, skeletons, theme);

  return skeletons;
}

// ── Measurement ─────────────────────────────────────────────────

function measureAll(
  node: MindmapNode,
  sizes: Map<string, { width: number; height: number }>,
): void {
  const textWidth = node.label.length * CHAR_WIDTH;
  let width = Math.max(textWidth + NODE_PADDING_X * 2, MIN_NODE_WIDTH);
  let height = MIN_NODE_HEIGHT;

  if (node.shape === "circle") {
    const size = Math.max(width * 1.3, height * 1.3);
    width = size;
    height = size;
  } else if (node.shape === "hexagon" || node.shape === "bang") {
    width = Math.max(width * 1.4, MIN_NODE_WIDTH);
    height = Math.max(height * 1.2, MIN_NODE_HEIGHT);
  }

  sizes.set(node.id, { width, height });

  for (const child of node.children) {
    measureAll(child, sizes);
  }
}

// ── Subtree height computation ──────────────────────────────────

function computeSubtreeHeight(
  node: MindmapNode,
  sizes: Map<string, { width: number; height: number }>,
  result: Map<string, number>,
): number {
  const { height } = sizes.get(node.id)!;

  if (node.children.length === 0) {
    result.set(node.id, height);
    return height;
  }

  let childrenTotal = 0;
  for (let i = 0; i < node.children.length; i++) {
    if (i > 0) childrenTotal += SIBLING_GAP;
    childrenTotal += computeSubtreeHeight(node.children[i], sizes, result);
  }

  const subtreeH = Math.max(height, childrenTotal);
  result.set(node.id, subtreeH);
  return subtreeH;
}

// ── Absolute layout ─────────────────────────────────────────────

function layoutAbsolute(
  node: MindmapNode,
  x: number,
  yTop: number,
  depth: number,
  sizes: Map<string, { width: number; height: number }>,
  subtreeHeights: Map<string, number>,
): LaidOutNode {
  const { width, height } = sizes.get(node.id)!;
  const subtreeH = subtreeHeights.get(node.id)!;
  node.level = depth;

  // Center this node vertically within its subtree band
  const y = yTop + (subtreeH - height) / 2;

  const children: LaidOutNode[] = [];
  const childX = x + width + LEVEL_GAP;

  // Stack children vertically within the subtree band
  let childYTop = yTop;
  for (const child of node.children) {
    const childSubH = subtreeHeights.get(child.id)!;
    children.push(
      layoutAbsolute(child, childX, childYTop, depth + 1, sizes, subtreeHeights),
    );
    childYTop += childSubH + SIBLING_GAP;
  }

  return { node, x, y, width, height, children };
}

// ── Rendering ───────────────────────────────────────────────────

function getNodeStyle(
  node: MindmapNode,
  depth: number,
  theme: MermaidTheme,
): ShapeStyle {
  if (depth === 0) return theme.mindmapRoot;
  if (node.children.length === 0) return theme.mindmapLeaf;
  return theme.mindmapNode;
}

function renderNode(
  laid: LaidOutNode,
  parent: LaidOutNode | null,
  skeletons: ExcalidrawElementSkeleton[],
  theme: MermaidTheme,
): void {
  const style = getNodeStyle(laid.node, laid.node.level, theme);

  // Branch line from parent's right edge to this node's left edge
  if (parent) {
    skeletons.push(createLine({
      startX: parent.x + parent.width,
      startY: parent.y + parent.height / 2,
      endX: laid.x,
      endY: laid.y + laid.height / 2,
      strokeColor: theme.mindmapBranch.stroke,
      strokeWidth: theme.mindmapBranch.strokeWidth,
    }));
  }

  // Node shape
  switch (laid.node.shape) {
    case "circle":
      skeletons.push(createEllipse({
        x: laid.x,
        y: laid.y,
        width: laid.width,
        height: laid.height,
        label: laid.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    case "hexagon":
      skeletons.push(createDiamond({
        x: laid.x,
        y: laid.y,
        width: laid.width,
        height: laid.height,
        label: laid.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    case "rounded":
    case "cloud":
      skeletons.push(createRect({
        x: laid.x,
        y: laid.y,
        width: laid.width,
        height: laid.height,
        label: laid.node.label,
        roundness: 16,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    case "bang":
      skeletons.push(createRect({
        x: laid.x,
        y: laid.y,
        width: laid.width,
        height: laid.height,
        label: laid.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
        strokeWidth: 2,
      }));
      break;

    case "square":
      skeletons.push(createRect({
        x: laid.x,
        y: laid.y,
        width: laid.width,
        height: laid.height,
        label: laid.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    default:
      skeletons.push(createRect({
        x: laid.x,
        y: laid.y,
        width: laid.width,
        height: laid.height,
        label: laid.node.label,
        roundness: 20,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
  }

  // Render children
  for (const child of laid.children) {
    renderNode(child, laid, skeletons, theme);
  }
}

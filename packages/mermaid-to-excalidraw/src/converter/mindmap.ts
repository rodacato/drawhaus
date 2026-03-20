/**
 * Mermaid Mindmap → Excalidraw elements converter.
 *
 * Uses a custom tree layout (not dagre) since mindmaps have a
 * radial/hierarchical structure determined by indentation.
 *
 * 1. Parse → MindmapAST
 * 2. Measure nodes
 * 3. Layout tree (recursive subtree positioning)
 * 4. Render nodes (shape-specific)
 * 5. Render branches (lines from parent to child)
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
  createText,
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
const SIBLING_GAP = 20;
const LEVEL_GAP = 80;

// ── Positioned node (after layout) ──────────────────────────────

interface PositionedNode {
  node: MindmapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  children: PositionedNode[];
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

  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Phase 1+2: Measure and layout
  const positioned = layoutTree(ast.root, 0);

  // Phase 3: Render
  renderTree(positioned, null, skeletons, theme, 0);

  return skeletons;
}

// ── Tree layout ─────────────────────────────────────────────────

function measureNode(node: MindmapNode): { width: number; height: number } {
  const textWidth = node.label.length * CHAR_WIDTH;
  let width = Math.max(textWidth + NODE_PADDING_X * 2, MIN_NODE_WIDTH);
  let height = MIN_NODE_HEIGHT;

  // Circle should be square-ish
  if (node.shape === "circle") {
    const size = Math.max(width, height);
    width = size;
    height = size;
  }

  // Hexagon/diamond need more space
  if (node.shape === "hexagon" || node.shape === "bang") {
    width = Math.max(width * 1.3, MIN_NODE_WIDTH);
  }

  return { width, height };
}

function layoutTree(node: MindmapNode, depth: number): PositionedNode {
  const { width, height } = measureNode(node);
  node.level = depth;

  if (node.children.length === 0) {
    return { node, x: 0, y: 0, width, height, children: [] };
  }

  // Layout children recursively
  const childPositions: PositionedNode[] = [];
  for (const child of node.children) {
    childPositions.push(layoutTree(child, depth + 1));
  }

  // Position children vertically, stacked below/right of parent
  // Using a horizontal tree layout (parent left, children right)
  let childY = 0;
  for (const cp of childPositions) {
    const subtreeHeight = getSubtreeHeight(cp);
    cp.x = width + LEVEL_GAP;
    cp.y = childY;
    childY += subtreeHeight + SIBLING_GAP;
  }

  // Center parent vertically relative to children
  const totalChildHeight = childY - SIBLING_GAP;
  const parentY = Math.max(0, (totalChildHeight - height) / 2);

  // Adjust children if parent is taller
  if (parentY === 0 && totalChildHeight < height) {
    const offset = (height - totalChildHeight) / 2;
    for (const cp of childPositions) {
      offsetTree(cp, 0, offset);
    }
  }

  return {
    node,
    x: 0,
    y: parentY,
    width,
    height,
    children: childPositions,
  };
}

function getSubtreeHeight(pos: PositionedNode): number {
  if (pos.children.length === 0) return pos.height;

  let maxBottom = pos.y + pos.height;
  for (const child of pos.children) {
    const childBottom = child.y + getSubtreeHeight(child);
    maxBottom = Math.max(maxBottom, childBottom);
  }

  return maxBottom - pos.y;
}

function offsetTree(pos: PositionedNode, dx: number, dy: number): void {
  pos.x += dx;
  pos.y += dy;
  for (const child of pos.children) {
    offsetTree(child, dx, dy);
  }
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

function renderTree(
  pos: PositionedNode,
  parentPos: PositionedNode | null,
  skeletons: ExcalidrawElementSkeleton[],
  theme: MermaidTheme,
  baseX: number,
): void {
  const absX = baseX + pos.x;
  const absY = pos.y;
  const style = getNodeStyle(pos.node, pos.node.level, theme);

  // Render branch line from parent to this node
  if (parentPos) {
    const parentAbsX = baseX - pos.x + parentPos.x;
    skeletons.push(createLine({
      startX: parentAbsX + parentPos.width,
      startY: parentPos.y + parentPos.height / 2,
      endX: absX,
      endY: absY + pos.height / 2,
      strokeColor: theme.mindmapBranch.stroke,
      strokeWidth: theme.mindmapBranch.strokeWidth,
    }));
  }

  // Render node shape
  switch (pos.node.shape) {
    case "circle":
      skeletons.push(createEllipse({
        x: absX,
        y: absY,
        width: pos.width,
        height: pos.height,
        label: pos.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    case "hexagon":
      skeletons.push(createDiamond({
        x: absX,
        y: absY,
        width: pos.width,
        height: pos.height,
        label: pos.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    case "rounded":
    case "cloud":
      skeletons.push(createRect({
        x: absX,
        y: absY,
        width: pos.width,
        height: pos.height,
        label: pos.node.label,
        roundness: 16,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    case "bang":
      skeletons.push(createRect({
        x: absX,
        y: absY,
        width: pos.width,
        height: pos.height,
        label: pos.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
        strokeWidth: 2,
      }));
      break;

    case "square":
      skeletons.push(createRect({
        x: absX,
        y: absY,
        width: pos.width,
        height: pos.height,
        label: pos.node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;

    default:
      // Default organic shape → rounded rect
      skeletons.push(createRect({
        x: absX,
        y: absY,
        width: pos.width,
        height: pos.height,
        label: pos.node.label,
        roundness: 20,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
  }

  // Render children
  for (const child of pos.children) {
    renderTree(child, pos, skeletons, theme, absX);
  }
}

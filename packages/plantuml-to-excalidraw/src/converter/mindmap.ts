import type { ExcalidrawElementSkeleton } from "../types.js";
import type { MindmapDiagramAST, MindmapNode } from "../parser/types.js";
import type { DiagramTheme } from "../theme/types.js";
import { createRect, createText, createLine } from "../elements.js";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9;
const PADDING_X = 16;
const PADDING_Y = 8;
const NODE_MIN_WIDTH = 60;
const NODE_HEIGHT = 32;
const H_GAP = 40;         // horizontal gap between parent and child
const V_GAP = 12;          // vertical gap between siblings

// ── Public API ──────────────────────────────────────────────────

export function mapMindmapDiagram(
  ast: MindmapDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  if (!ast.root) return [];

  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Separate children by side
  const rightChildren = ast.root.children.filter((c) => c.side === "right");
  const leftChildren = ast.root.children.filter((c) => c.side === "left");

  // Measure subtree heights
  const rightHeight = subtreeHeight(rightChildren);
  const leftHeight = subtreeHeight(leftChildren);
  const totalHeight = Math.max(rightHeight, leftHeight, NODE_HEIGHT);

  // Root position — center vertically
  const rootWidth = measureNodeWidth(ast.root.label);
  const rootX = 0;
  const rootY = totalHeight / 2 - NODE_HEIGHT / 2;

  // Render root node
  renderNode(ast.root, rootX, rootY, rootWidth, theme, skeletons, true);

  // Layout right children
  if (rightChildren.length > 0) {
    const startX = rootX + rootWidth + H_GAP;
    const startY = rootY + NODE_HEIGHT / 2 - rightHeight / 2;
    layoutChildren(rightChildren, startX, startY, "right", rootX + rootWidth, rootY + NODE_HEIGHT / 2, theme, skeletons);
  }

  // Layout left children
  if (leftChildren.length > 0) {
    const totalLeftWidth = maxSubtreeWidth(leftChildren, 0);
    const startX = rootX - H_GAP - totalLeftWidth;
    const startY = rootY + NODE_HEIGHT / 2 - leftHeight / 2;
    layoutChildren(leftChildren, startX, startY, "left", rootX, rootY + NODE_HEIGHT / 2, theme, skeletons);
  }

  return skeletons;
}

// ── Layout helpers ──────────────────────────────────────────────

function layoutChildren(
  children: MindmapNode[],
  startX: number,
  startY: number,
  side: "right" | "left",
  parentEdgeX: number,
  parentCenterY: number,
  theme: DiagramTheme,
  skeletons: ExcalidrawElementSkeleton[],
): void {
  let currentY = startY;

  for (const child of children) {
    const childWidth = measureNodeWidth(child.label);
    const childSubtreeH = subtreeHeight([child]);

    // Center the node within its subtree allocation
    const nodeY = currentY + childSubtreeH / 2 - NODE_HEIGHT / 2;

    let nodeX: number;
    if (side === "right") {
      nodeX = startX;
    } else {
      // Left side: align right edge of node to startX + maxWidth
      const maxW = maxSubtreeWidth(children, 0);
      nodeX = startX + maxW - childWidth;
    }

    // Render the node
    renderNode(child, nodeX, nodeY, childWidth, theme, skeletons, false);

    // Draw branch line from parent edge to this node
    const childEdgeX = side === "right" ? nodeX : nodeX + childWidth;
    const childCenterY = nodeY + NODE_HEIGHT / 2;

    skeletons.push(
      createLine({
        startX: parentEdgeX,
        startY: parentCenterY,
        endX: childEdgeX,
        endY: childCenterY,
        strokeColor: theme.mindmapBranch.stroke,
        strokeWidth: theme.mindmapBranch.strokeWidth,
      }),
    );

    // Recurse into grandchildren
    const grandchildren = child.children;
    if (grandchildren.length > 0) {
      const gcHeight = subtreeHeight(grandchildren);
      const gcStartY = nodeY + NODE_HEIGHT / 2 - gcHeight / 2;

      if (side === "right") {
        const gcStartX = nodeX + childWidth + H_GAP;
        layoutChildren(grandchildren, gcStartX, gcStartY, "right", nodeX + childWidth, nodeY + NODE_HEIGHT / 2, theme, skeletons);
      } else {
        const gcMaxW = maxSubtreeWidth(grandchildren, 0);
        const gcStartX = nodeX - H_GAP - gcMaxW;
        layoutChildren(grandchildren, gcStartX, gcStartY, "left", nodeX, nodeY + NODE_HEIGHT / 2, theme, skeletons);
      }
    }

    currentY += childSubtreeH + V_GAP;
  }
}

function renderNode(
  node: MindmapNode,
  x: number,
  y: number,
  width: number,
  theme: DiagramTheme,
  skeletons: ExcalidrawElementSkeleton[],
  isRoot: boolean,
): void {
  const style = isRoot ? theme.mindmapRoot : theme.mindmapNode;

  skeletons.push(
    createRect({
      x,
      y,
      width,
      height: NODE_HEIGHT,
      backgroundColor: style.fill,
      strokeColor: style.stroke,
      strokeStyle: style.strokeStyle,
      roundness: isRoot ? 8 : 4,
    }),
  );

  skeletons.push(
    createText({
      x: x + width / 2,
      y: y + PADDING_Y,
      text: node.label,
      fontSize: isRoot ? theme.headerText.fontSize : theme.memberText.fontSize,
      color: isRoot ? theme.headerText.color : theme.memberText.color,
      textAlign: "center",
    }),
  );
}

// ── Measurement helpers ─────────────────────────────────────────

function measureNodeWidth(label: string): number {
  return Math.max(label.length * CHAR_WIDTH + PADDING_X * 2, NODE_MIN_WIDTH);
}

function subtreeHeight(children: MindmapNode[]): number {
  if (children.length === 0) return NODE_HEIGHT;

  let total = 0;
  for (let i = 0; i < children.length; i++) {
    const childH = Math.max(NODE_HEIGHT, subtreeHeight(children[i].children));
    total += childH;
    if (i < children.length - 1) total += V_GAP;
  }
  return total;
}

function maxSubtreeWidth(children: MindmapNode[], _depth: number): number {
  if (children.length === 0) return 0;

  let maxW = 0;
  for (const child of children) {
    const nodeW = measureNodeWidth(child.label);
    const childrenW = child.children.length > 0
      ? H_GAP + maxSubtreeWidth(child.children, _depth + 1)
      : 0;
    maxW = Math.max(maxW, nodeW + childrenW);
  }
  return maxW;
}

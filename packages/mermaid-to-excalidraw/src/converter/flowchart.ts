/**
 * Mermaid Flowchart → Excalidraw elements converter.
 *
 * 1. Parse → FlowchartAST
 * 2. Measure nodes
 * 3. Layout with dagre
 * 4. Render nodes (shape-specific: rect, diamond, ellipse, etc.)
 * 5. Render subgraphs as dashed containers
 * 6. Render edges as arrows
 */

import type { ExcalidrawElementSkeleton, MermaidConfig, MermaidToExcalidrawResult } from "../types.js";
import type { FlowchartAST, FlowNode, FlowEdge, SubGraph, NodeShape, EdgeStyle } from "../parser/flowchart-types.js";
import type { MermaidTheme, ShapeStyle } from "../theme/types.js";
import { DEFAULT_THEME } from "../theme/default.js";
import { parseMermaidFlowchart } from "../parser/flowchart.js";
import {
  createRect,
  createText,
  createArrow,
  createLine,
  resetIdCounter,
} from "../elements.js";
import { createEllipse, createDiamond } from "../elements.js";
import {
  layoutGraph,
  buildArrowPoints,
  type LayoutNode,
  type LayoutEdge,
  type Box,
} from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9;
const NODE_PADDING_X = 24;
const NODE_PADDING_Y = 16;
const MIN_NODE_WIDTH = 80;
const MIN_NODE_HEIGHT = 40;
const SUBGRAPH_PADDING = 30;
const SUBGRAPH_GAP = 20;

// ── Public API ──────────────────────────────────────────────────

export async function convertFlowchart(
  definition: string,
  _config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  resetIdCounter();

  const ast = parseMermaidFlowchart(definition);
  const elements = mapFlowchart(ast, DEFAULT_THEME);

  return {
    elements,
    diagramType: "flowchart",
  };
}

export function mapFlowchart(
  ast: FlowchartAST,
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Calculate dimensions for each node
  const nodeDimensions = new Map<string, { width: number; height: number }>();
  for (const node of ast.nodes) {
    const dim = measureNode(node);
    nodeDimensions.set(node.id, dim);
  }

  // Map direction
  const dir = ast.direction === "BT" ? "BT" : ast.direction === "RL" ? "RL" : ast.direction === "LR" ? "LR" : "TB";

  // Build layout graph
  const layoutNodes: LayoutNode[] = ast.nodes.map((n) => ({
    id: n.id,
    ...nodeDimensions.get(n.id)!,
  }));

  const layoutEdges: LayoutEdge[] = ast.edges.map((e, i) => ({
    source: e.sourceId,
    target: e.targetId,
    id: `edge_${i}`,
  }));

  // Use larger rank separation when subgraphs are present to avoid overlapping containers
  const rankSep = ast.subGraphs.length > 0 ? 120 : 80;
  const layout = layoutGraph(layoutNodes, layoutEdges, dir as "TB" | "LR", 60, rankSep);

  // Expand subgraph nodeIds to include all descendant nodes
  expandSubGraphNodes(ast.subGraphs);

  // Two-pass subgraph rendering:
  // Pass 1: compute bounds inner-first (original order: inner subgraphs first)
  const sgBounds = new Map<string, { x: number; y: number; w: number; h: number }>();
  const sgSkeletonMap = new Map<string, ExcalidrawElementSkeleton[]>();
  for (const sg of ast.subGraphs) {
    const sgSkeleton = renderSubGraph(sg, layout.nodes, theme, sgBounds);
    if (sgSkeleton) sgSkeletonMap.set(sg.id, sgSkeleton);
  }

  // Pass 2: add to output outer-first (reversed) for correct z-ordering
  for (const sg of [...ast.subGraphs].reverse()) {
    const s = sgSkeletonMap.get(sg.id);
    if (s) skeletons.push(...s);
  }

  // Build node ID map for arrow bindings
  const nodeIdMap = new Map<string, string>();

  // Render nodes
  const nodeMap = new Map<string, FlowNode>();
  for (const node of ast.nodes) {
    nodeMap.set(node.id, node);
  }

  for (const node of ast.nodes) {
    const pos = layout.nodes.get(node.id);
    if (!pos) continue;

    const nodeSkeletons = renderNode(node, pos.x, pos.y, nodeDimensions.get(node.id)!, theme);
    if (nodeSkeletons.length > 0 && nodeSkeletons[0].id) {
      nodeIdMap.set(node.id, nodeSkeletons[0].id as string);
    }
    skeletons.push(...nodeSkeletons);
  }

  // Render edges
  for (let i = 0; i < ast.edges.length; i++) {
    const edge = ast.edges[i];
    const sourcePos = layout.nodes.get(edge.sourceId);
    const targetPos = layout.nodes.get(edge.targetId);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`edge_${i}`);

    const arrowSkeleton = renderEdge(
      edge,
      sourcePos,
      targetPos,
      theme,
      nodeIdMap.get(edge.sourceId),
      nodeIdMap.get(edge.targetId),
      edgePoints?.points,
    );
    skeletons.push(arrowSkeleton);
  }

  return skeletons;
}

// ── Node measurement ────────────────────────────────────────────

function measureNode(node: FlowNode): { width: number; height: number } {
  const textWidth = node.label.length * CHAR_WIDTH;
  let width = Math.max(textWidth + NODE_PADDING_X * 2, MIN_NODE_WIDTH);
  let height = MIN_NODE_HEIGHT;

  // Diamond/hexagon: text sits inside inscribed area (~50% of bounding box)
  if (node.shape === "diamond" || node.shape === "hexagon") {
    width = Math.max(width * 1.8, MIN_NODE_WIDTH * 1.6);
    height = Math.max(height * 1.8, MIN_NODE_HEIGHT * 1.6);
  }

  // Circle: text inscribed inside circle (~70% usable area), must be square
  if (node.shape === "circle") {
    const textDim = Math.max(width, height);
    const size = Math.max(textDim * 1.4, MIN_NODE_WIDTH * 1.2);
    width = size;
    height = size;
  }

  // Database/ellipse: text inscribed (~70% usable width)
  if (node.shape === "database") {
    width = Math.max(width * 1.3, MIN_NODE_WIDTH * 1.2);
    height = Math.max(height * 1.3, MIN_NODE_HEIGHT * 1.2);
  }

  return { width, height };
}

// ── Node rendering ──────────────────────────────────────────────

function getNodeStyle(shape: NodeShape, theme: MermaidTheme): ShapeStyle {
  switch (shape) {
    case "diamond":
    case "hexagon":
      return theme.flowDecision;
    case "database":
      return theme.flowDatabase;
    case "circle":
      return theme.flowCircle;
    default:
      return theme.flowNode;
  }
}

function renderNode(
  node: FlowNode,
  x: number,
  y: number,
  dim: { width: number; height: number },
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const style = getNodeStyle(node.shape, theme);
  const skeletons: ExcalidrawElementSkeleton[] = [];

  switch (node.shape) {
    case "diamond":
    case "hexagon": {
      skeletons.push(createDiamond({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
    }
    case "circle": {
      skeletons.push(createEllipse({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
    }
    case "database": {
      // Database = ellipse (cylinder approximation)
      skeletons.push(createEllipse({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
    }
    case "stadium":
    case "rounded": {
      skeletons.push(createRect({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        roundness: 20,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
    }
    case "subroutine": {
      // Subroutine = double-bordered rectangle (approximate with thicker stroke)
      skeletons.push(createRect({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
        strokeWidth: 2,
      }));
      break;
    }
    case "asymmetric": {
      // Asymmetric → use rectangle as approximation
      skeletons.push(createRect({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
    }
    case "rectangle":
    case "parallelogram":
    case "trapezoid":
    default: {
      skeletons.push(createRect({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label: node.label,
        backgroundColor: style.fill,
        strokeColor: style.stroke,
        strokeStyle: style.strokeStyle,
      }));
      break;
    }
  }

  return skeletons;
}

// ── Subgraph helpers ─────────────────────────────────────────────

/** Expand each subgraph's nodeIds to include all descendant nodes */
function expandSubGraphNodes(subGraphs: SubGraph[]): void {
  const sgMap = new Map<string, SubGraph>();
  for (const sg of subGraphs) sgMap.set(sg.id, sg);

  function collect(sg: SubGraph, visited: Set<string>): string[] {
    if (visited.has(sg.id)) return [];
    visited.add(sg.id);
    const ids = [...sg.nodeIds];
    for (const childId of sg.childSubGraphIds) {
      const child = sgMap.get(childId);
      if (child) ids.push(...collect(child, visited));
    }
    return ids;
  }

  for (const sg of subGraphs) {
    sg.nodeIds = [...new Set(collect(sg, new Set()))];
  }
}

// ── Subgraph rendering ──────────────────────────────────────────

function renderSubGraph(
  sg: SubGraph,
  nodePositions: Map<string, Box>,
  theme: MermaidTheme,
  sgBounds: Map<string, { x: number; y: number; w: number; h: number }>,
): ExcalidrawElementSkeleton[] | null {
  // Calculate bounding box from contained nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const nodeId of sg.nodeIds) {
    const pos = nodePositions.get(nodeId);
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  // Also include child subgraph bounds (already rendered)
  for (const childId of sg.childSubGraphIds) {
    const cb = sgBounds.get(childId);
    if (!cb) continue;
    minX = Math.min(minX, cb.x);
    minY = Math.min(minY, cb.y);
    maxX = Math.max(maxX, cb.x + cb.w);
    maxY = Math.max(maxY, cb.y + cb.h);
  }

  if (minX === Infinity) return null;

  const style = theme.flowSubgraph;
  const pad = SUBGRAPH_PADDING;

  const containerX = minX - pad;
  const containerY = minY - pad - 20; // Extra space for label
  const containerW = maxX - minX + pad * 2;
  const containerH = maxY - minY + pad * 2 + 20;

  // Store bounds so parent subgraphs can include us
  sgBounds.set(sg.id, { x: containerX, y: containerY, w: containerW, h: containerH });

  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Container rectangle
  skeletons.push(createRect({
    x: containerX,
    y: containerY,
    width: containerW,
    height: containerH,
    backgroundColor: style.fill,
    strokeColor: style.stroke,
    strokeStyle: style.strokeStyle,
  }));

  // Label text
  skeletons.push(createText({
    x: containerX + 10,
    y: containerY + 4,
    text: sg.label,
    fontSize: theme.labelText.fontSize,
    color: theme.labelText.color,
    textAlign: "left",
  }));

  return skeletons;
}

// ── Edge rendering ──────────────────────────────────────────────

function renderEdge(
  edge: FlowEdge,
  source: Box,
  target: Box,
  theme: MermaidTheme,
  sourceId?: string,
  targetId?: string,
  dagrePoints?: Array<{ x: number; y: number }>,
): ExcalidrawElementSkeleton {
  const points = buildArrowPoints(source, target, dagrePoints);

  let arrowTheme = theme.arrow;
  let strokeStyle: "solid" | "dashed" = "solid";

  if (edge.style === "dotted") {
    arrowTheme = theme.dependencyArrow;
    strokeStyle = "dashed";
  } else if (edge.style === "thick") {
    arrowTheme = theme.thickArrow;
  }

  return createArrow({
    points,
    label: edge.label ?? undefined,
    startArrowhead: null,
    endArrowhead: edge.hasArrow ? "arrow" : null,
    strokeStyle,
    strokeColor: arrowTheme.stroke,
    strokeWidth: arrowTheme.strokeWidth,
    startId: sourceId,
    endId: targetId,
  });
}

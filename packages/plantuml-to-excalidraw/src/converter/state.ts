import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  StateDiagramAST,
  StateNode,
  StateTransition,
} from "../parser/types.js";
import type { DiagramTheme } from "../theme/types.js";
import { createRect, createText, createArrow, createEllipse } from "../elements.js";
import {
  layoutGraph,
  buildArrowPoints,
  type LayoutNode,
  type LayoutEdge,
} from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9.5;
const LINE_HEIGHT = 22;
const PADDING_X = 24;
const PADDING_Y = 14;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 40;
const ROUNDNESS = 12;
const PSEUDOSTATE_SIZE = 24;
const COMPOSITE_PADDING = 30;
const COMPOSITE_HEADER_HEIGHT = 30;

// ── Public API ──────────────────────────────────────────────────

export function mapStateDiagram(
  ast: StateDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Flatten all nodes for layout (including pseudo-states from transitions)
  const allNodeNames = collectAllNodeNames(ast.states, ast.transitions);

  // Measure each node
  const nodeDimensions = new Map<string, { width: number; height: number }>();
  const nodeMap = buildNodeMap(ast.states);

  for (const name of allNodeNames) {
    const node = nodeMap.get(name);
    if (name === "[*]") {
      nodeDimensions.set(name, { width: PSEUDOSTATE_SIZE, height: PSEUDOSTATE_SIZE });
    } else if (node?.kind === "composite") {
      const innerDim = measureCompositeInner(node, theme);
      nodeDimensions.set(name, {
        width: innerDim.width + COMPOSITE_PADDING * 2,
        height: innerDim.height + COMPOSITE_HEADER_HEIGHT + COMPOSITE_PADDING,
      });
    } else {
      const dim = measureSimpleState(node, name, theme);
      nodeDimensions.set(name, dim);
    }
  }

  // Handle multiple [*] references: use unique IDs for start vs end
  const pseudoIds = assignPseudoIds(ast.transitions);
  const layoutNodeNames = remapPseudoNodes(allNodeNames, pseudoIds);

  // Build layout graph
  const layoutNodes: LayoutNode[] = layoutNodeNames.map((id) => {
    const origName = pseudoIds.idToName.get(id) ?? id;
    const dim = nodeDimensions.get(origName)!;
    return { id, ...dim };
  });

  const layoutEdges: LayoutEdge[] = ast.transitions.map((t, i) => ({
    source: pseudoIds.transitionFrom(t, i),
    target: pseudoIds.transitionTo(t, i),
    id: `trans_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 60, 80);

  // Map of node name/id → element id for arrow binding
  const elementIds = new Map<string, string>();

  // Render each node
  for (const id of layoutNodeNames) {
    const pos = layout.nodes.get(id);
    if (!pos) continue;

    const origName = pseudoIds.idToName.get(id) ?? id;

    if (origName === "[*]") {
      const el = renderPseudoState(pos.x, pos.y, theme);
      elementIds.set(id, el.id!);
      skeletons.push(el);
    } else {
      const node = nodeMap.get(origName);
      if (node?.kind === "composite") {
        const els = renderCompositeState(node, pos.x, pos.y, theme);
        if (els.length > 0 && els[0].id) elementIds.set(id, els[0].id);
        skeletons.push(...els);
      } else {
        const els = renderSimpleState(node, origName, pos.x, pos.y, theme);
        if (els.length > 0 && els[0].id) elementIds.set(id, els[0].id);
        skeletons.push(...els);
      }
    }
  }

  // Render transitions
  for (let i = 0; i < ast.transitions.length; i++) {
    const t = ast.transitions[i];
    const fromId = pseudoIds.transitionFrom(t, i);
    const toId = pseudoIds.transitionTo(t, i);
    const sourcePos = layout.nodes.get(fromId);
    const targetPos = layout.nodes.get(toId);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`trans_${i}`);
    const points = buildArrowPoints(sourcePos, targetPos, edgePoints?.points);

    skeletons.push(
      createArrow({
        points,
        label: t.label ?? undefined,
        endArrowhead: "arrow",
        strokeColor: theme.arrow.stroke,
        strokeWidth: theme.arrow.strokeWidth,
        startId: elementIds.get(fromId),
        endId: elementIds.get(toId),
      }),
    );
  }

  return skeletons;
}

// ── Pseudo-state ID management ──────────────────────────────────
// [*] can appear multiple times (as start and end). We assign unique
// IDs so dagre can lay them out separately.

interface PseudoIdMap {
  idToName: Map<string, string>;
  transitionFrom: (t: StateTransition, idx: number) => string;
  transitionTo: (t: StateTransition, idx: number) => string;
}

function assignPseudoIds(transitions: StateTransition[]): PseudoIdMap {
  const idToName = new Map<string, string>();
  let pseudoCounter = 0;

  const fromIds = new Map<number, string>();
  const toIds = new Map<number, string>();

  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    if (t.from === "[*]") {
      const id = `__pseudo_${pseudoCounter++}`;
      idToName.set(id, "[*]");
      fromIds.set(i, id);
    }
    if (t.to === "[*]") {
      const id = `__pseudo_${pseudoCounter++}`;
      idToName.set(id, "[*]");
      toIds.set(i, id);
    }
  }

  return {
    idToName,
    transitionFrom: (t, idx) => fromIds.get(idx) ?? t.from,
    transitionTo: (t, idx) => toIds.get(idx) ?? t.to,
  };
}

function remapPseudoNodes(
  allNames: string[],
  pseudoIds: PseudoIdMap,
): string[] {
  const result: string[] = [];
  for (const name of allNames) {
    if (name === "[*]") continue; // replaced by individual pseudo IDs
    result.push(name);
  }
  for (const id of pseudoIds.idToName.keys()) {
    result.push(id);
  }
  return result;
}

// ── Node collection ─────────────────────────────────────────────

function collectAllNodeNames(
  states: StateNode[],
  transitions: StateTransition[],
): string[] {
  const names = new Set<string>();
  for (const s of states) {
    if (s.kind === "pseudo") {
      names.add(s.name);
    } else {
      names.add(s.name);
    }
  }
  for (const t of transitions) {
    names.add(t.from);
    names.add(t.to);
  }
  return [...names];
}

function buildNodeMap(states: StateNode[]): Map<string, StateNode> {
  const map = new Map<string, StateNode>();
  for (const s of states) {
    if (s.kind !== "pseudo") {
      map.set(s.name, s);
    }
  }
  return map;
}

// ── Measurement ─────────────────────────────────────────────────

function measureSimpleState(
  node: StateNode | undefined,
  name: string,
  _theme: DiagramTheme,
): { width: number; height: number } {
  const displayName = getDisplayName(node, name);
  const description = node?.kind === "simple" ? node.description : null;

  let textWidth = displayName.length * CHAR_WIDTH + PADDING_X * 2;
  let height = MIN_HEIGHT;

  if (description) {
    textWidth = Math.max(textWidth, description.length * CHAR_WIDTH + PADDING_X * 2);
    height += LINE_HEIGHT;
  }

  return {
    width: Math.max(textWidth, MIN_WIDTH),
    height,
  };
}

function measureCompositeInner(
  node: StateNode & { kind: "composite" },
  theme: DiagramTheme,
): { width: number; height: number } {
  // Measure inner states + transitions using layout
  const innerNames = collectAllNodeNames(node.children, node.transitions);
  if (innerNames.length === 0) return { width: MIN_WIDTH, height: MIN_HEIGHT };

  const innerNodeMap = buildNodeMap(node.children);
  const dims = new Map<string, { width: number; height: number }>();

  for (const name of innerNames) {
    if (name === "[*]") {
      dims.set(name, { width: PSEUDOSTATE_SIZE, height: PSEUDOSTATE_SIZE });
    } else {
      const inner = innerNodeMap.get(name);
      dims.set(name, measureSimpleState(inner, name, theme));
    }
  }

  const layoutNodes: LayoutNode[] = innerNames.map((id) => ({
    id,
    ...dims.get(id)!,
  }));
  const layoutEdges: LayoutEdge[] = node.transitions.map((t, i) => ({
    source: t.from,
    target: t.to,
    id: `inner_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 40, 60);

  // Compute bounding box of all inner nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [, pos] of layout.nodes) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  return {
    width: Math.max(maxX - minX, MIN_WIDTH),
    height: Math.max(maxY - minY, MIN_HEIGHT),
  };
}

// ── Rendering ───────────────────────────────────────────────────

function renderPseudoState(
  x: number,
  y: number,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton {
  return createEllipse({
    x,
    y,
    width: PSEUDOSTATE_SIZE,
    height: PSEUDOSTATE_SIZE,
    backgroundColor: theme.startEnd.fill,
    strokeColor: theme.startEnd.stroke,
  });
}

function renderSimpleState(
  node: StateNode | undefined,
  name: string,
  x: number,
  y: number,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const displayName = getDisplayName(node, name);
  const description = node?.kind === "simple" ? node.description : null;
  const dim = measureSimpleState(node, name, theme);

  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Rounded rectangle
  skeletons.push(
    createRect({
      x,
      y,
      width: dim.width,
      height: dim.height,
      roundness: ROUNDNESS,
      backgroundColor: theme.state.fill,
      strokeColor: theme.state.stroke,
      strokeStyle: theme.state.strokeStyle,
    }),
  );

  // State name (centered)
  const centerX = x + dim.width / 2;
  let textY = y + PADDING_Y;

  skeletons.push(
    createText({
      x: centerX,
      y: textY,
      text: displayName,
      fontSize: theme.headerText.fontSize,
      color: theme.headerText.color,
      textAlign: "center",
    }),
  );

  // Description (centered, below name)
  if (description) {
    textY += LINE_HEIGHT;
    skeletons.push(
      createText({
        x: centerX,
        y: textY,
        text: description,
        fontSize: theme.memberText.fontSize,
        color: theme.memberText.color,
        textAlign: "center",
      }),
    );
  }

  return skeletons;
}

function renderCompositeState(
  node: StateNode & { kind: "composite" },
  x: number,
  y: number,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  const outerDim = {
    width: measureCompositeInner(node, theme).width + COMPOSITE_PADDING * 2,
    height: measureCompositeInner(node, theme).height + COMPOSITE_HEADER_HEIGHT + COMPOSITE_PADDING,
  };

  // Outer container rectangle
  skeletons.push(
    createRect({
      x,
      y,
      width: outerDim.width,
      height: outerDim.height,
      roundness: ROUNDNESS,
      backgroundColor: theme.compositeState.fill,
      strokeColor: theme.compositeState.stroke,
      strokeStyle: theme.compositeState.strokeStyle,
    }),
  );

  // Header label
  const displayName = node.label ?? node.name;
  skeletons.push(
    createText({
      x: x + COMPOSITE_PADDING,
      y: y + 8,
      text: displayName,
      fontSize: theme.headerText.fontSize,
      color: theme.headerText.color,
      textAlign: "left",
    }),
  );

  // Layout inner children
  const innerNames = collectAllNodeNames(node.children, node.transitions);
  if (innerNames.length === 0) return skeletons;

  const innerNodeMap = buildNodeMap(node.children);
  const dims = new Map<string, { width: number; height: number }>();

  for (const name of innerNames) {
    if (name === "[*]") {
      dims.set(name, { width: PSEUDOSTATE_SIZE, height: PSEUDOSTATE_SIZE });
    } else {
      const inner = innerNodeMap.get(name);
      dims.set(name, measureSimpleState(inner, name, theme));
    }
  }

  const layoutNodes: LayoutNode[] = innerNames.map((id) => ({
    id,
    ...dims.get(id)!,
  }));
  const layoutEdges: LayoutEdge[] = node.transitions.map((t, i) => ({
    source: t.from,
    target: t.to,
    id: `comp_${i}`,
  }));

  const innerLayout = layoutGraph(layoutNodes, layoutEdges, "TB", 40, 60);

  // Find bounding box to offset inner elements
  let minX = Infinity, minY = Infinity;
  for (const [, pos] of innerLayout.nodes) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
  }

  const offsetX = x + COMPOSITE_PADDING - minX;
  const offsetY = y + COMPOSITE_HEADER_HEIGHT - minY;

  const innerElementIds = new Map<string, string>();

  for (const name of innerNames) {
    const pos = innerLayout.nodes.get(name);
    if (!pos) continue;

    const px = pos.x + offsetX;
    const py = pos.y + offsetY;

    if (name === "[*]") {
      const el = renderPseudoState(px, py, theme);
      innerElementIds.set(name, el.id!);
      skeletons.push(el);
    } else {
      const inner = innerNodeMap.get(name);
      const els = renderSimpleState(inner, name, px, py, theme);
      if (els.length > 0 && els[0].id) innerElementIds.set(name, els[0].id);
      skeletons.push(...els);
    }
  }

  // Inner transitions
  for (let i = 0; i < node.transitions.length; i++) {
    const t = node.transitions[i];
    const srcPos = innerLayout.nodes.get(t.from);
    const tgtPos = innerLayout.nodes.get(t.to);
    if (!srcPos || !tgtPos) continue;

    const offsetSrc = {
      x: srcPos.x + offsetX,
      y: srcPos.y + offsetY,
      width: srcPos.width,
      height: srcPos.height,
    };
    const offsetTgt = {
      x: tgtPos.x + offsetX,
      y: tgtPos.y + offsetY,
      width: tgtPos.width,
      height: tgtPos.height,
    };

    const edgePoints = innerLayout.edges.get(`comp_${i}`);
    const rawPoints = edgePoints?.points?.map((p) => ({
      x: p.x + offsetX,
      y: p.y + offsetY,
    }));

    const points = buildArrowPoints(offsetSrc, offsetTgt, rawPoints);

    skeletons.push(
      createArrow({
        points,
        label: t.label ?? undefined,
        endArrowhead: "arrow",
        strokeColor: theme.arrow.stroke,
        strokeWidth: theme.arrow.strokeWidth,
        startId: innerElementIds.get(t.from),
        endId: innerElementIds.get(t.to),
      }),
    );
  }

  return skeletons;
}

// ── Helpers ─────────────────────────────────────────────────────

function getDisplayName(node: StateNode | undefined, fallback: string): string {
  if (!node) return fallback;
  if (node.kind === "simple" || node.kind === "composite") {
    return node.label ?? node.name;
  }
  return fallback;
}

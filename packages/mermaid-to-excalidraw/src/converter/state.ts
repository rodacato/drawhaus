/**
 * Mermaid State Diagram → Excalidraw elements converter.
 *
 * 1. Parse → StateDiagramAST
 * 2. Flatten states (including nested composites)
 * 3. Measure states
 * 4. Layout with dagre
 * 5. Render states (shape-specific: rect, ellipse, diamond, bar)
 * 6. Render composite containers
 * 7. Render transitions as arrows
 * 8. Render notes
 */

import type {
  ExcalidrawElementSkeleton,
  MermaidConfig,
  MermaidToExcalidrawResult,
} from "../types.js";
import type {
  StateDiagramAST,
  StateNode,
  StateTransition,
  StateNote,
  Direction,
} from "../parser/state-types.js";
import type { MermaidTheme } from "../theme/types.js";
import { DEFAULT_THEME } from "../theme/default.js";
import { parseMermaidStateDiagram } from "../parser/state.js";
import {
  createRect,
  createText,
  createArrow,
  createLine,
  createEllipse,
  createDiamond,
  resetIdCounter,
} from "../elements.js";
import {
  layoutGraph,
  buildArrowPoints,
  type LayoutNode,
  type LayoutEdge,
  type Box,
} from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9;
const STATE_PADDING_X = 24;
const STATE_PADDING_Y = 12;
const MIN_STATE_WIDTH = 100;
const MIN_STATE_HEIGHT = 40;
const START_END_SIZE = 24;
const CHOICE_SIZE = 36;
const FORK_JOIN_WIDTH = 6;
const FORK_JOIN_HEIGHT = 60;
const COMPOSITE_PADDING = 30;
const NOTE_WIDTH = 140;
const NOTE_HEIGHT = 36;
const NOTE_PADDING = 8;

// ── Public API ──────────────────────────────────────────────────

export async function convertStateDiagram(
  definition: string,
  _config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  resetIdCounter();

  const ast = parseMermaidStateDiagram(definition);
  const elements = mapStateDiagram(ast, DEFAULT_THEME);

  return {
    elements,
    diagramType: "stateDiagram",
  };
}

export function mapStateDiagram(
  ast: StateDiagramAST,
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  if (ast.states.length === 0) return skeletons;

  // ── Phase 1: Flatten all states ─────────────────────────────
  const allStates: StateNode[] = [];
  const compositeStates: StateNode[] = [];
  flattenStates(ast.states, allStates, compositeStates);

  // ── Phase 2: Measure states ─────────────────────────────────
  const stateDimensions = new Map<string, { width: number; height: number }>();
  for (const state of allStates) {
    const dim = measureState(state);
    stateDimensions.set(state.id, dim);
  }

  // ── Phase 3: Collect all transitions ────────────────────────
  const allTransitions: StateTransition[] = [];
  collectTransitions(ast, allTransitions);

  // ── Phase 4: Layout with dagre ──────────────────────────────
  const dir = ast.direction === "LR" ? "LR" : "TB";

  const layoutNodes: LayoutNode[] = allStates.map((s) => ({
    id: s.id,
    ...stateDimensions.get(s.id)!,
  }));

  const layoutEdges: LayoutEdge[] = allTransitions.map((t, i) => ({
    source: t.sourceId,
    target: t.targetId,
    id: `state_edge_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, dir, 60, 80);

  // ── Phase 5: Render composite containers (behind everything) ─
  for (const cs of compositeStates) {
    const containerSkeletons = renderComposite(cs, layout.nodes, theme);
    if (containerSkeletons) skeletons.push(...containerSkeletons);
  }

  // ── Phase 6: Render states ──────────────────────────────────
  const stateIdMap = new Map<string, string>();

  for (const state of allStates) {
    const pos = layout.nodes.get(state.id);
    if (!pos) continue;

    const dim = stateDimensions.get(state.id)!;
    const stateSkeletons = renderState(state, pos.x, pos.y, dim, theme);
    if (stateSkeletons.length > 0 && stateSkeletons[0].id) {
      stateIdMap.set(state.id, stateSkeletons[0].id as string);
    }
    skeletons.push(...stateSkeletons);
  }

  // ── Phase 7: Render transitions ─────────────────────────────
  for (let i = 0; i < allTransitions.length; i++) {
    const trans = allTransitions[i];
    const sourcePos = layout.nodes.get(trans.sourceId);
    const targetPos = layout.nodes.get(trans.targetId);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`state_edge_${i}`);

    const arrow = renderTransition(
      trans,
      sourcePos,
      targetPos,
      theme,
      stateIdMap.get(trans.sourceId),
      stateIdMap.get(trans.targetId),
      edgePoints?.points,
    );
    skeletons.push(arrow);
  }

  // ── Phase 8: Render notes ───────────────────────────────────
  for (const note of ast.notes) {
    const pos = layout.nodes.get(note.stateId);
    if (!pos) continue;
    skeletons.push(...renderNote(note, pos, stateDimensions.get(note.stateId)!, theme));
  }

  return skeletons;
}

// ── Helpers ─────────────────────────────────────────────────────

function flattenStates(
  states: StateNode[],
  allStates: StateNode[],
  compositeStates: StateNode[],
): void {
  for (const state of states) {
    allStates.push(state);
    if (state.children) {
      compositeStates.push(state);
      flattenStates(state.children.states, allStates, compositeStates);
    }
  }
}

function collectTransitions(
  ast: StateDiagramAST,
  allTransitions: StateTransition[],
): void {
  allTransitions.push(...ast.transitions);
  for (const state of ast.states) {
    if (state.children) {
      collectTransitions(state.children, allTransitions);
    }
  }
}

// ── State measurement ───────────────────────────────────────────

function measureState(state: StateNode): { width: number; height: number } {
  switch (state.kind) {
    case "start":
    case "end":
      return { width: START_END_SIZE, height: START_END_SIZE };
    case "choice":
      return { width: CHOICE_SIZE, height: CHOICE_SIZE };
    case "fork":
    case "join":
      return { width: FORK_JOIN_WIDTH, height: FORK_JOIN_HEIGHT };
    default: {
      const label = state.label ?? state.description ?? state.id;
      const textWidth = label.length * CHAR_WIDTH;
      const width = Math.max(textWidth + STATE_PADDING_X * 2, MIN_STATE_WIDTH);
      let height = MIN_STATE_HEIGHT;
      if (state.description && state.label) {
        height += 20; // extra for description below label
      }
      return { width, height };
    }
  }
}

// ── State rendering ─────────────────────────────────────────────

function renderState(
  state: StateNode,
  x: number,
  y: number,
  dim: { width: number; height: number },
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  switch (state.kind) {
    case "start": {
      skeletons.push(createEllipse({
        x,
        y,
        width: dim.width,
        height: dim.height,
        backgroundColor: theme.stateStart.fill,
        strokeColor: theme.stateStart.stroke,
      }));
      break;
    }
    case "end": {
      // End state: filled circle with outer ring
      skeletons.push(createEllipse({
        x,
        y,
        width: dim.width,
        height: dim.height,
        backgroundColor: theme.stateEnd.fill,
        strokeColor: theme.stateEnd.stroke,
      }));
      break;
    }
    case "choice": {
      skeletons.push(createDiamond({
        x,
        y,
        width: dim.width,
        height: dim.height,
        backgroundColor: theme.stateChoice.fill,
        strokeColor: theme.stateChoice.stroke,
      }));
      break;
    }
    case "fork":
    case "join": {
      skeletons.push(createRect({
        x,
        y,
        width: dim.width,
        height: dim.height,
        backgroundColor: theme.stateForkJoin.fill,
        strokeColor: theme.stateForkJoin.stroke,
        fillStyle: "solid",
      }));
      break;
    }
    default: {
      const label = state.label ?? state.description ?? state.id;
      skeletons.push(createRect({
        x,
        y,
        width: dim.width,
        height: dim.height,
        label,
        roundness: 12,
        backgroundColor: theme.stateNode.fill,
        strokeColor: theme.stateNode.stroke,
        strokeStyle: theme.stateNode.strokeStyle,
      }));
      break;
    }
  }

  return skeletons;
}

// ── Composite rendering ─────────────────────────────────────────

function renderComposite(
  state: StateNode,
  nodePositions: Map<string, Box>,
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] | null {
  if (!state.children) return null;

  // Calculate bounding box from child states
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const childIds = state.children.states.map((s) => s.id);
  for (const childId of childIds) {
    const pos = nodePositions.get(childId);
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  if (minX === Infinity) return null;

  const pad = COMPOSITE_PADDING;
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Container rectangle
  skeletons.push(createRect({
    x: minX - pad,
    y: minY - pad - 20,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2 + 20,
    backgroundColor: theme.stateComposite.fill,
    strokeColor: theme.stateComposite.stroke,
    strokeStyle: theme.stateComposite.strokeStyle,
    roundness: 12,
  }));

  // Label
  const label = state.label ?? state.id;
  skeletons.push(createText({
    x: minX - pad + 10,
    y: minY - pad - 16,
    text: label,
    fontSize: theme.labelText.fontSize,
    color: theme.labelText.color,
    textAlign: "left",
  }));

  return skeletons;
}

// ── Transition rendering ────────────────────────────────────────

function renderTransition(
  trans: StateTransition,
  source: Box,
  target: Box,
  theme: MermaidTheme,
  sourceId?: string,
  targetId?: string,
  dagrePoints?: Array<{ x: number; y: number }>,
): ExcalidrawElementSkeleton {
  const points = buildArrowPoints(source, target, dagrePoints);

  return createArrow({
    points,
    label: trans.label ?? undefined,
    startArrowhead: null,
    endArrowhead: "arrow",
    strokeStyle: "solid",
    strokeColor: theme.stateTransition.stroke,
    strokeWidth: theme.stateTransition.strokeWidth,
    startId: sourceId,
    endId: targetId,
  });
}

// ── Note rendering ──────────────────────────────────────────────

function renderNote(
  note: StateNote,
  statePos: Box,
  stateDim: { width: number; height: number },
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const noteW = Math.max(note.text.length * CHAR_WIDTH + NOTE_PADDING * 2, NOTE_WIDTH);
  const noteH = NOTE_HEIGHT;

  let noteX: number;
  if (note.placement === "right") {
    noteX = statePos.x + stateDim.width + 10;
  } else {
    noteX = statePos.x - noteW - 10;
  }
  const noteY = statePos.y;

  return [
    createRect({
      x: noteX,
      y: noteY,
      width: noteW,
      height: noteH,
      label: note.text,
      backgroundColor: theme.stateNote.fill,
      strokeColor: theme.stateNote.stroke,
      strokeStyle: theme.stateNote.strokeStyle,
    }),
  ];
}

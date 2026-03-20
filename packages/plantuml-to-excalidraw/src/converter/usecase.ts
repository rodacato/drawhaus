import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  UseCaseDiagramAST,
  UseCaseRelation,
  UseCaseRelationType,
} from "../parser/types.js";
import { createRect, createText, createArrow, createEllipse } from "../elements.js";
import {
  layoutGraph,
  buildArrowPoints,
  type LayoutNode,
  type LayoutEdge,
  type Box,
} from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 8.4;
const PADDING = 16;
const ACTOR_MIN_WIDTH = 80;
const ACTOR_HEIGHT = 40;
const USECASE_MIN_WIDTH = 140;
const USECASE_HEIGHT = 50;
const BOUNDARY_PADDING = 30;

// ── Public API ──────────────────────────────────────────────────

export function mapUseCaseDiagram(
  ast: UseCaseDiagramAST,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Build alias → name lookup
  const aliasMap = new Map<string, string>();
  for (const actor of ast.actors) {
    if (actor.alias) aliasMap.set(actor.alias, actor.name);
  }
  for (const uc of ast.useCases) {
    if (uc.alias) aliasMap.set(uc.alias, uc.name);
  }

  // Resolve alias to name
  const resolve = (id: string) => aliasMap.get(id) ?? id;

  // Collect all node names (actors + use cases, including implicit from relations)
  const actorNames = new Set(ast.actors.map((a) => a.name));
  const useCaseNames = new Set(ast.useCases.map((uc) => uc.name));

  for (const rel of ast.relations) {
    const left = resolve(rel.left);
    const right = resolve(rel.right);
    // If not declared, guess: parenthesized names are use cases, others are actors
    if (!actorNames.has(left) && !useCaseNames.has(left)) {
      actorNames.add(left);
    }
    if (!actorNames.has(right) && !useCaseNames.has(right)) {
      useCaseNames.add(right);
    }
  }

  // Measure nodes
  const nodeDimensions = new Map<string, { width: number; height: number }>();

  for (const name of actorNames) {
    const w = Math.max(name.length * CHAR_WIDTH + PADDING * 2, ACTOR_MIN_WIDTH);
    nodeDimensions.set(name, { width: w, height: ACTOR_HEIGHT });
  }

  for (const name of useCaseNames) {
    // Ellipses need ~1.3x width for the same text
    const w = Math.max(name.length * CHAR_WIDTH * 1.3 + PADDING * 2, USECASE_MIN_WIDTH);
    nodeDimensions.set(name, { width: w, height: USECASE_HEIGHT });
  }

  // Build layout graph
  const layoutNodes: LayoutNode[] = [];
  for (const [name, dim] of nodeDimensions) {
    layoutNodes.push({ id: name, ...dim });
  }

  const layoutEdges: LayoutEdge[] = ast.relations.map((r, i) => ({
    source: resolve(r.left),
    target: resolve(r.right),
    id: `rel_${i}`,
  }));

  const direction = ast.direction === "LR" ? "LR" : "TB";
  const layout = layoutGraph(layoutNodes, layoutEdges, direction, 80, 100);

  // Track element IDs for arrow binding
  const nodeIds = new Map<string, string>();

  // Render boundaries first (behind everything)
  for (const boundary of ast.boundaries) {
    const childNames = ast.useCases
      .filter((uc) => uc.boundary === boundary.name)
      .map((uc) => uc.name);

    const childBoxes = childNames
      .map((name) => layout.nodes.get(name))
      .filter(Boolean) as Box[];

    if (childBoxes.length > 0) {
      const bounds = getBoundingBox(childBoxes);
      skeletons.push(
        createRect({
          x: bounds.x - BOUNDARY_PADDING,
          y: bounds.y - BOUNDARY_PADDING - 20, // extra for title
          width: bounds.width + BOUNDARY_PADDING * 2,
          height: bounds.height + BOUNDARY_PADDING * 2 + 20,
          strokeStyle: "dashed",
          backgroundColor: "transparent",
        }),
      );
      skeletons.push(
        createText({
          x: bounds.x - BOUNDARY_PADDING + PADDING,
          y: bounds.y - BOUNDARY_PADDING - 16,
          text: boundary.name,
          fontSize: 14,
          textAlign: "center",
        }),
      );
    }
  }

  // Render actors as rectangles with «actor» stereotype
  for (const name of actorNames) {
    const pos = layout.nodes.get(name);
    if (!pos) continue;

    const rect = createRect({
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      backgroundColor: "#e8eaf6",
      roundness: 4,
    });
    if (rect.id) nodeIds.set(name, rect.id);
    skeletons.push(rect);

    skeletons.push(
      createText({
        x: pos.x + PADDING,
        y: pos.y + 4,
        text: "«actor»",
        fontSize: 10,
        textAlign: "center",
      }),
    );
    skeletons.push(
      createText({
        x: pos.x + PADDING,
        y: pos.y + 18,
        text: name,
        fontSize: 14,
        textAlign: "center",
      }),
    );
  }

  // Render use cases as ellipses
  for (const name of useCaseNames) {
    const pos = layout.nodes.get(name);
    if (!pos) continue;

    const ellipse = createEllipse({
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      label: name,
      backgroundColor: "#f3e5f5",
    });
    if (ellipse.id) nodeIds.set(name, ellipse.id);
    skeletons.push(ellipse);
  }

  // Render relations
  for (let i = 0; i < ast.relations.length; i++) {
    const rel = ast.relations[i];
    const leftName = resolve(rel.left);
    const rightName = resolve(rel.right);
    const sourcePos = layout.nodes.get(leftName);
    const targetPos = layout.nodes.get(rightName);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`rel_${i}`);
    const { startArrowhead, endArrowhead, strokeStyle } = getArrowStyle(rel.relationType);

    // For include/extend, add stereotype label if not already labeled
    let label = rel.label ?? undefined;
    if (!label && rel.relationType === "include") label = "«include»";
    if (!label && rel.relationType === "extend") label = "«extend»";

    const points = buildArrowPoints(sourcePos, targetPos, edgePoints?.points);

    skeletons.push(
      createArrow({
        points,
        label,
        startArrowhead,
        endArrowhead,
        strokeStyle,
        startId: nodeIds.get(leftName),
        endId: nodeIds.get(rightName),
      }),
    );
  }

  return skeletons;
}

// ── Helpers ──────────────────────────────────────────────────────

function getArrowStyle(relationType: UseCaseRelationType): {
  startArrowhead: "arrow" | "triangle" | null;
  endArrowhead: "arrow" | "triangle" | null;
  strokeStyle: "solid" | "dashed";
} {
  switch (relationType) {
    case "directed":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "solid" };
    case "include":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "dashed" };
    case "extend":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "dashed" };
    case "inheritance":
      return { startArrowhead: null, endArrowhead: "triangle", strokeStyle: "solid" };
    case "association":
    default:
      return { startArrowhead: null, endArrowhead: null, strokeStyle: "solid" };
  }
}

function getBoundingBox(boxes: Box[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

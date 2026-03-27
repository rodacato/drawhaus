/**
 * Mermaid ER Diagram → Excalidraw elements converter.
 *
 * 1. Parse → ERDiagramAST
 * 2. Measure entities (header + attributes)
 * 3. Layout with dagre
 * 4. Render entities as sectioned rectangles
 * 5. Render relationships as arrows with cardinality labels
 */

import type {
  ExcalidrawElementSkeleton,
  MermaidConfig,
  MermaidToExcalidrawResult,
} from "../types.js";
import type {
  ERAttribute,
  ERDiagramAST,
  EREntity,
  ERRelation,
  Cardinality,
} from "../parser/er-types.js";
import type { MermaidTheme } from "../theme/types.js";
import { DEFAULT_THEME } from "../theme/default.js";
import { parseMermaidERDiagram } from "../parser/er.js";
import {
  createRect,
  createText,
  createArrow,
  createLine,
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

const CHAR_WIDTH = 9.5;
const LINE_HEIGHT = 22;
const PADDING_X = 20;
const PADDING_Y = 12;
const MIN_WIDTH = 160;
const SEPARATOR_GAP = 8;

// ── Public API ──────────────────────────────────────────────────

export async function convertERDiagram(
  definition: string,
  _config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> {
  resetIdCounter();

  const ast = parseMermaidERDiagram(definition);
  const elements = mapERDiagram(ast, DEFAULT_THEME);

  return {
    elements,
    diagramType: "erDiagram",
  };
}

export function mapERDiagram(
  ast: ERDiagramAST,
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  if (ast.entities.length === 0) return skeletons;

  // ── Phase 1: Measure entities ──────────────────────────────
  const entityDimensions = new Map<string, { width: number; height: number }>();
  for (const entity of ast.entities) {
    const dim = measureEntity(entity, theme);
    entityDimensions.set(entity.name, dim);
  }

  // ── Phase 2: Layout with dagre ─────────────────────────────
  const layoutNodes: LayoutNode[] = ast.entities.map((e) => ({
    id: e.name,
    ...entityDimensions.get(e.name)!,
  }));

  const layoutEdges: LayoutEdge[] = ast.relations.map((r, i) => ({
    source: r.left,
    target: r.right,
    id: `er_edge_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 80, 120);

  // ── Phase 3: Render entities ───────────────────────────────
  const entityIdMap = new Map<string, string>();
  const entityMap = new Map<string, EREntity>();
  for (const entity of ast.entities) {
    entityMap.set(entity.name, entity);
  }

  for (const entity of ast.entities) {
    const pos = layout.nodes.get(entity.name);
    if (!pos) continue;

    const dim = entityDimensions.get(entity.name)!;
    const entitySkeletons = renderEntity(
      entity,
      pos.x,
      pos.y,
      dim,
      theme,
    );

    if (entitySkeletons.length > 0 && entitySkeletons[0].id) {
      entityIdMap.set(entity.name, entitySkeletons[0].id as string);
    }
    skeletons.push(...entitySkeletons);
  }

  // ── Phase 4: Render relationships ──────────────────────────
  for (let i = 0; i < ast.relations.length; i++) {
    const rel = ast.relations[i];
    const sourcePos = layout.nodes.get(rel.left);
    const targetPos = layout.nodes.get(rel.right);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`er_edge_${i}`);

    const relSkeletons = renderRelation(
      rel,
      sourcePos,
      targetPos,
      theme,
      entityIdMap.get(rel.left),
      entityIdMap.get(rel.right),
      edgePoints?.points,
    );
    skeletons.push(...relSkeletons);
  }

  return skeletons;
}

// ── Entity measurement ──────────────────────────────────────────

function measureEntity(
  entity: EREntity,
  theme: MermaidTheme,
): { width: number; height: number } {
  // Header line
  const headerWidth = entity.name.length * CHAR_WIDTH;

  // Attribute lines
  let maxAttrWidth = 0;
  for (const attr of entity.attributes) {
    const attrText = formatAttribute(attr);
    maxAttrWidth = Math.max(maxAttrWidth, attrText.length * CHAR_WIDTH);
  }

  const width = Math.max(
    Math.max(headerWidth, maxAttrWidth) + PADDING_X * 2,
    MIN_WIDTH,
  );

  // Height: header + separator + attributes
  let height = PADDING_Y + LINE_HEIGHT; // header
  if (entity.attributes.length > 0) {
    height += SEPARATOR_GAP; // separator
    height += entity.attributes.length * LINE_HEIGHT;
  }
  height += PADDING_Y;

  return { width, height };
}

function formatAttribute(attr: ERAttribute): string {
  let text = `${attr.type} ${attr.name}`;
  if (attr.constraints.length > 0) {
    text += ` ${attr.constraints.join(", ")}`;
  }
  return text;
}

// ── Entity rendering ────────────────────────────────────────────

function renderEntity(
  entity: EREntity,
  x: number,
  y: number,
  dim: { width: number; height: number },
  theme: MermaidTheme,
): ExcalidrawElementSkeleton[] {
  const style = theme.erEntity;
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Container rectangle
  skeletons.push(createRect({
    x,
    y,
    width: dim.width,
    height: dim.height,
    backgroundColor: style.fill,
    strokeColor: style.stroke,
    strokeStyle: style.strokeStyle,
  }));

  // Header text (entity name)
  skeletons.push(createText({
    x: x + PADDING_X,
    y: y + PADDING_Y,
    text: entity.name,
    fontSize: theme.headerText.fontSize,
    color: theme.headerText.color,
    textAlign: "left",
  }));

  if (entity.attributes.length > 0) {
    // Separator line
    const sepY = y + PADDING_Y + LINE_HEIGHT + SEPARATOR_GAP / 2;
    skeletons.push(createLine({
      startX: x,
      startY: sepY,
      endX: x + dim.width,
      endY: sepY,
      strokeColor: theme.separator.stroke,
      strokeWidth: theme.separator.strokeWidth,
    }));

    // Attribute lines
    let attrY = y + PADDING_Y + LINE_HEIGHT + SEPARATOR_GAP;
    for (const attr of entity.attributes) {
      const text = formatAttribute(attr);
      const isPK = attr.constraints.includes("PK");

      skeletons.push(createText({
        x: x + PADDING_X,
        y: attrY,
        text,
        fontSize: theme.memberText.fontSize,
        color: isPK ? theme.headerText.color : theme.memberText.color,
        textAlign: "left",
      }));

      attrY += LINE_HEIGHT;
    }
  }

  return skeletons;
}

// ── Relationship rendering ──────────────────────────────────────

function cardinalitySymbol(c: Cardinality): string {
  switch (c) {
    case "one": return "1";
    case "zeroOrOne": return "0..1";
    case "many": return "0..*";
    case "oneOrMore": return "1..*";
  }
}

function renderRelation(
  rel: ERRelation,
  source: Box,
  target: Box,
  theme: MermaidTheme,
  sourceId?: string,
  targetId?: string,
  dagrePoints?: Array<{ x: number; y: number }>,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  const points = buildArrowPoints(source, target, dagrePoints);
  const arrowTheme = rel.lineType === "nonIdentifying"
    ? theme.erDashedRelation
    : theme.erRelation;

  // Build label with cardinality and relationship name
  const leftCard = cardinalitySymbol(rel.leftCardinality);
  const rightCard = cardinalitySymbol(rel.rightCardinality);
  const labelParts: string[] = [];
  if (leftCard) labelParts.push(leftCard);
  if (rel.label) labelParts.push(rel.label);
  if (rightCard) labelParts.push(rightCard);
  const label = labelParts.join(" — ");

  skeletons.push(createArrow({
    points,
    label: label || undefined,
    startArrowhead: null,
    endArrowhead: null,
    strokeStyle: rel.lineType === "nonIdentifying" ? "dashed" : "solid",
    strokeColor: arrowTheme.stroke,
    strokeWidth: arrowTheme.strokeWidth,
    startId: sourceId,
    endId: targetId,
  }));

  return skeletons;
}

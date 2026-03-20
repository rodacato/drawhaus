import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  ObjectDiagramAST,
  ObjectEntity,
  ObjectField,
  ClassRelationType,
} from "../parser/types.js";
import { createRect, createText, createArrow, createLine } from "../elements.js";
import {
  layoutGraph,
  buildArrowPoints,
  type LayoutNode,
  type LayoutEdge,
  type Box,
} from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 8.4;
const LINE_HEIGHT = 20;
const PADDING_X = 16;
const PADDING_Y = 10;
const SECTION_SEPARATOR_HEIGHT = 8;
const MIN_WIDTH = 140;
const HEADER_FONT_SIZE = 16;
const FIELD_FONT_SIZE = 14;

const ENTITY_STYLES: Record<ObjectEntity["kind"], { backgroundColor: string }> = {
  object: { backgroundColor: "#e3f2fd" },  // blue
  map:    { backgroundColor: "#fff8e1" },  // amber
};

// ── Public API ──────────────────────────────────────────────────

export function mapObjectDiagram(
  ast: ObjectDiagramAST,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Calculate dimensions for each entity
  const entityDimensions = new Map<string, { width: number; height: number }>();
  for (const entity of ast.entities) {
    entityDimensions.set(entity.name, measureEntity(entity));
  }

  // Build layout graph
  const layoutNodes: LayoutNode[] = ast.entities.map((e) => ({
    id: e.name,
    ...entityDimensions.get(e.name)!,
  }));

  const layoutEdges: LayoutEdge[] = ast.relations.map((r, i) => ({
    source: r.left,
    target: r.right,
    id: `rel_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 80, 120);

  // Render entities
  const entityIds = new Map<string, string>();

  for (const entity of ast.entities) {
    const pos = layout.nodes.get(entity.name);
    if (!pos) continue;

    const entitySkeletons = renderEntity(entity, pos.x, pos.y);
    if (entitySkeletons.length > 0 && entitySkeletons[0].id) {
      entityIds.set(entity.name, entitySkeletons[0].id);
    }
    skeletons.push(...entitySkeletons);
  }

  // Render relations
  for (let i = 0; i < ast.relations.length; i++) {
    const rel = ast.relations[i];
    const sourcePos = layout.nodes.get(rel.left);
    const targetPos = layout.nodes.get(rel.right);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`rel_${i}`);
    skeletons.push(
      renderRelation(
        rel.relationType,
        rel.label,
        sourcePos,
        targetPos,
        entityIds.get(rel.left),
        entityIds.get(rel.right),
        edgePoints?.points,
      ),
    );
  }

  return skeletons;
}

// ── Entity rendering ────────────────────────────────────────────

function measureEntity(entity: ObjectEntity): { width: number; height: number } {
  const headerText = getHeaderText(entity);
  const fieldLines = entity.fields.map(formatField);

  const allLines = [headerText, ...fieldLines];
  const maxLineWidth = Math.max(
    ...allLines.map((l) => l.length * CHAR_WIDTH + PADDING_X * 2),
    MIN_WIDTH,
  );

  let height = PADDING_Y + LINE_HEIGHT; // top padding + header
  if (entity.fields.length > 0) {
    height += SECTION_SEPARATOR_HEIGHT;
    height += entity.fields.length * LINE_HEIGHT;
  }
  height += PADDING_Y; // bottom padding

  return { width: maxLineWidth, height };
}

function renderEntity(
  entity: ObjectEntity,
  x: number,
  y: number,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  const dim = measureEntity(entity);
  const style = ENTITY_STYLES[entity.kind];

  // Main bounding rectangle
  skeletons.push(
    createRect({
      x,
      y,
      width: dim.width,
      height: dim.height,
      backgroundColor: style.backgroundColor,
    }),
  );

  let currentY = y + PADDING_Y;

  // Header: object name (underlined style via bold text)
  skeletons.push(
    createText({
      x: x + PADDING_X,
      y: currentY,
      text: getHeaderText(entity),
      fontSize: HEADER_FONT_SIZE,
      textAlign: "center",
    }),
  );
  currentY += LINE_HEIGHT;

  // Separator after header
  if (entity.fields.length > 0) {
    currentY += SECTION_SEPARATOR_HEIGHT / 2;
    skeletons.push(
      createLine({
        startX: x,
        startY: currentY,
        endX: x + dim.width,
        endY: currentY,
      }),
    );
    currentY += SECTION_SEPARATOR_HEIGHT / 2;

    // Fields
    for (const field of entity.fields) {
      skeletons.push(
        createText({
          x: x + PADDING_X,
          y: currentY,
          text: formatField(field),
          fontSize: FIELD_FONT_SIZE,
        }),
      );
      currentY += LINE_HEIGHT;
    }
  }

  return skeletons;
}

// ── Relation rendering (shared with class.ts pattern) ───────────

function renderRelation(
  relationType: ClassRelationType,
  label: string | null,
  source: Box,
  target: Box,
  sourceId?: string,
  targetId?: string,
  dagrePoints?: Array<{ x: number; y: number }>,
): ExcalidrawElementSkeleton {
  const { startArrowhead, endArrowhead, strokeStyle } =
    getArrowStyle(relationType);

  const points = buildArrowPoints(source, target, dagrePoints);

  return createArrow({
    points,
    label: label ?? undefined,
    startArrowhead,
    endArrowhead,
    strokeStyle,
    startId: sourceId,
    endId: targetId,
  });
}

function getArrowStyle(relationType: ClassRelationType): {
  startArrowhead: "arrow" | "triangle" | "diamond" | null;
  endArrowhead: "arrow" | "triangle" | "diamond" | null;
  strokeStyle: "solid" | "dashed";
} {
  switch (relationType) {
    case "inheritance":
      return { startArrowhead: null, endArrowhead: "triangle", strokeStyle: "solid" };
    case "inheritance_reverse":
      return { startArrowhead: "triangle", endArrowhead: null, strokeStyle: "solid" };
    case "implementation":
      return { startArrowhead: null, endArrowhead: "triangle", strokeStyle: "dashed" };
    case "implementation_reverse":
      return { startArrowhead: "triangle", endArrowhead: null, strokeStyle: "dashed" };
    case "composition":
      return { startArrowhead: null, endArrowhead: "diamond", strokeStyle: "solid" };
    case "composition_reverse":
      return { startArrowhead: "diamond", endArrowhead: null, strokeStyle: "solid" };
    case "aggregation":
      return { startArrowhead: null, endArrowhead: "diamond", strokeStyle: "solid" };
    case "aggregation_reverse":
      return { startArrowhead: "diamond", endArrowhead: null, strokeStyle: "solid" };
    case "directed_association":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "solid" };
    case "directed_association_reverse":
      return { startArrowhead: "arrow", endArrowhead: null, strokeStyle: "solid" };
    case "dependency":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "dashed" };
    case "association":
    default:
      return { startArrowhead: null, endArrowhead: null, strokeStyle: "solid" };
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function getHeaderText(entity: ObjectEntity): string {
  if (entity.instanceOf) {
    return `${entity.name} : ${entity.instanceOf}`;
  }
  return entity.name;
}

function formatField(field: ObjectField): string {
  return field.separator === "=>"
    ? `${field.key} => ${field.value}`
    : `${field.key} = ${field.value}`;
}

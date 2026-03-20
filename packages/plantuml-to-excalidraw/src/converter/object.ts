import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  ObjectDiagramAST,
  ObjectEntity,
  ObjectField,
  ClassRelationType,
} from "../parser/types.js";
import type { DiagramTheme } from "../theme/types.js";
import { createRect, createText, createArrow, createLine } from "../elements.js";
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
const SECTION_SEPARATOR_HEIGHT = 8;
const MIN_WIDTH = 160;

// ── Public API ──────────────────────────────────────────────────

export function mapObjectDiagram(
  ast: ObjectDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  const entityDimensions = new Map<string, { width: number; height: number }>();
  for (const entity of ast.entities) {
    entityDimensions.set(entity.name, measureEntity(entity));
  }

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

  const entityIds = new Map<string, string>();

  for (const entity of ast.entities) {
    const pos = layout.nodes.get(entity.name);
    if (!pos) continue;

    const entitySkeletons = renderEntity(entity, pos.x, pos.y, theme);
    if (entitySkeletons.length > 0 && entitySkeletons[0].id) {
      entityIds.set(entity.name, entitySkeletons[0].id);
    }
    skeletons.push(...entitySkeletons);
  }

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
        theme,
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

  let height = PADDING_Y + LINE_HEIGHT;
  if (entity.fields.length > 0) {
    height += SECTION_SEPARATOR_HEIGHT;
    height += entity.fields.length * LINE_HEIGHT;
  }
  height += PADDING_Y;

  return { width: maxLineWidth, height };
}

function renderEntity(
  entity: ObjectEntity,
  x: number,
  y: number,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  const dim = measureEntity(entity);
  const style = entity.kind === "map" ? theme.map : theme.object;

  const centerX = x + dim.width / 2;

  skeletons.push(
    createRect({
      x,
      y,
      width: dim.width,
      height: dim.height,
      backgroundColor: style.fill,
      strokeColor: style.stroke,
      strokeStyle: style.strokeStyle,
    }),
  );

  let currentY = y + PADDING_Y;

  // Header: centered
  skeletons.push(
    createText({
      x: centerX,
      y: currentY,
      text: getHeaderText(entity),
      fontSize: theme.headerText.fontSize,
      color: theme.headerText.color,
      textAlign: "center",
    }),
  );
  currentY += LINE_HEIGHT;

  // Separator + fields (left-aligned)
  if (entity.fields.length > 0) {
    currentY += SECTION_SEPARATOR_HEIGHT / 2;
    skeletons.push(
      createLine({
        startX: x,
        startY: currentY,
        endX: x + dim.width,
        endY: currentY,
        strokeColor: theme.separator.stroke,
        strokeWidth: theme.separator.strokeWidth,
      }),
    );
    currentY += SECTION_SEPARATOR_HEIGHT / 2;

    for (const field of entity.fields) {
      skeletons.push(
        createText({
          x: x + PADDING_X,
          y: currentY,
          text: formatField(field),
          fontSize: theme.memberText.fontSize,
          color: theme.memberText.color,
          textAlign: "left",
        }),
      );
      currentY += LINE_HEIGHT;
    }
  }

  return skeletons;
}

// ── Relation rendering ──────────────────────────────────────────

function renderRelation(
  relationType: ClassRelationType,
  label: string | null,
  source: Box,
  target: Box,
  theme: DiagramTheme,
  sourceId?: string,
  targetId?: string,
  dagrePoints?: Array<{ x: number; y: number }>,
): ExcalidrawElementSkeleton {
  const { startArrowhead, endArrowhead, strokeStyle, isDependency } =
    getArrowStyle(relationType);

  const arrowTheme = isDependency ? theme.dependencyArrow : theme.arrow;
  const points = buildArrowPoints(source, target, dagrePoints);

  return createArrow({
    points,
    label: label ?? undefined,
    startArrowhead,
    endArrowhead,
    strokeStyle,
    strokeColor: arrowTheme.stroke,
    strokeWidth: arrowTheme.strokeWidth,
    startId: sourceId,
    endId: targetId,
  });
}

function getArrowStyle(relationType: ClassRelationType): {
  startArrowhead: "arrow" | "triangle" | "diamond" | null;
  endArrowhead: "arrow" | "triangle" | "diamond" | null;
  strokeStyle: "solid" | "dashed";
  isDependency: boolean;
} {
  switch (relationType) {
    case "inheritance":
      return { startArrowhead: null, endArrowhead: "triangle", strokeStyle: "solid", isDependency: false };
    case "inheritance_reverse":
      return { startArrowhead: "triangle", endArrowhead: null, strokeStyle: "solid", isDependency: false };
    case "implementation":
      return { startArrowhead: null, endArrowhead: "triangle", strokeStyle: "dashed", isDependency: true };
    case "implementation_reverse":
      return { startArrowhead: "triangle", endArrowhead: null, strokeStyle: "dashed", isDependency: true };
    case "composition":
      return { startArrowhead: null, endArrowhead: "diamond", strokeStyle: "solid", isDependency: false };
    case "composition_reverse":
      return { startArrowhead: "diamond", endArrowhead: null, strokeStyle: "solid", isDependency: false };
    case "aggregation":
      return { startArrowhead: null, endArrowhead: "diamond", strokeStyle: "solid", isDependency: false };
    case "aggregation_reverse":
      return { startArrowhead: "diamond", endArrowhead: null, strokeStyle: "solid", isDependency: false };
    case "directed_association":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "solid", isDependency: false };
    case "directed_association_reverse":
      return { startArrowhead: "arrow", endArrowhead: null, strokeStyle: "solid", isDependency: false };
    case "dependency":
      return { startArrowhead: null, endArrowhead: "arrow", strokeStyle: "dashed", isDependency: true };
    case "association":
    default:
      return { startArrowhead: null, endArrowhead: null, strokeStyle: "solid", isDependency: false };
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

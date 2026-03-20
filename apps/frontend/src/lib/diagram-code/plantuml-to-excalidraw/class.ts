import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type {
  ClassDiagramAST,
  ClassEntity,
  ClassMember,
  ClassRelationType,
} from "../plantuml-parser/types";
import { createRect, createText, createArrow, createLine } from "./elements";
import { layoutGraph, type LayoutNode, type LayoutEdge } from "./layout";
import { clampToBoxBorder, buildArrowPoints, type Box } from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 8.4;
const LINE_HEIGHT = 20;
const PADDING_X = 16;
const PADDING_Y = 10;
const SECTION_SEPARATOR_HEIGHT = 8;
const MIN_WIDTH = 140;
const HEADER_FONT_SIZE = 16;
const MEMBER_FONT_SIZE = 14;

// ── Entity styles by kind ───────────────────────────────────────

type EntityStyle = {
  backgroundColor: string;
  strokeStyle: "solid" | "dashed" | "dotted";
};

const ENTITY_STYLES: Record<ClassEntity["kind"], EntityStyle> = {
  class:          { backgroundColor: "#e3f2fd", strokeStyle: "solid" },   // blue
  abstract_class: { backgroundColor: "#f3e5f5", strokeStyle: "solid" },   // purple
  interface:      { backgroundColor: "#e8f5e9", strokeStyle: "dashed" },  // green, dashed border
  enum:           { backgroundColor: "#fff8e1", strokeStyle: "solid" },   // amber/yellow
};

// ── Public API ──────────────────────────────────────────────────

export function mapClassDiagram(
  ast: ClassDiagramAST,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Calculate dimensions for each entity
  const entityDimensions = new Map<string, { width: number; height: number }>();
  for (const entity of ast.entities) {
    const dim = measureEntity(entity);
    entityDimensions.set(entity.name, dim);
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

  // Render each entity as a group of rectangles + text
  const entityIds = new Map<string, string>();

  for (const entity of ast.entities) {
    const pos = layout.nodes.get(entity.name);
    if (!pos) continue;

    const entitySkeletons = renderEntity(entity, pos.x, pos.y);
    // Store the main rect id for arrow binding
    if (entitySkeletons.length > 0 && entitySkeletons[0].id) {
      entityIds.set(entity.name, entitySkeletons[0].id);
    }
    skeletons.push(...entitySkeletons);
  }

  // Render relations as arrows using dagre edge points for routing
  for (let i = 0; i < ast.relations.length; i++) {
    const rel = ast.relations[i];
    const sourcePos = layout.nodes.get(rel.left);
    const targetPos = layout.nodes.get(rel.right);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`rel_${i}`);

    const arrowSkeleton = renderRelation(
      rel.relationType,
      rel.label,
      sourcePos,
      targetPos,
      entityIds.get(rel.left),
      entityIds.get(rel.right),
      edgePoints?.points,
    );
    skeletons.push(arrowSkeleton);
  }

  return skeletons;
}

// ── Entity rendering ────────────────────────────────────────────

interface EntityDimensions {
  width: number;
  height: number;
}

function measureEntity(entity: ClassEntity): EntityDimensions {
  const headerLines = getHeaderLines(entity);
  const { attributes, methods } = splitMembers(entity.members);

  const allLines = [
    ...headerLines,
    ...attributes.map(formatMember),
    ...methods.map(formatMember),
  ];

  const maxLineWidth = Math.max(
    ...allLines.map((l) => l.length * CHAR_WIDTH + PADDING_X * 2),
    MIN_WIDTH,
  );

  let height = PADDING_Y; // top padding
  // Header: stereotype lines are shorter (16px), class name is full LINE_HEIGHT
  for (let i = 0; i < headerLines.length; i++) {
    height += i < headerLines.length - 1 ? 16 : LINE_HEIGHT;
  }
  if (attributes.length > 0 || methods.length > 0) {
    height += SECTION_SEPARATOR_HEIGHT; // separator after header
  }
  if (attributes.length > 0) {
    height += attributes.length * LINE_HEIGHT;
    if (methods.length > 0) {
      height += SECTION_SEPARATOR_HEIGHT; // separator between attrs and methods
    }
  }
  if (methods.length > 0) {
    height += methods.length * LINE_HEIGHT;
  }
  height += PADDING_Y; // bottom padding

  return { width: maxLineWidth, height };
}

function renderEntity(
  entity: ClassEntity,
  x: number,
  y: number,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  const dim = measureEntity(entity);
  const headerLines = getHeaderLines(entity);
  const { attributes, methods } = splitMembers(entity.members);

  // Style based on entity kind
  const style = ENTITY_STYLES[entity.kind];

  // Main bounding rectangle
  const mainRect = createRect({
    x,
    y,
    width: dim.width,
    height: dim.height,
    backgroundColor: style.backgroundColor,
    strokeStyle: style.strokeStyle,
  });
  skeletons.push(mainRect);

  let currentY = y + PADDING_Y;

  // Header: stereotype line (smaller, muted) + class name (bold)
  for (let i = 0; i < headerLines.length; i++) {
    const isStereotype = i < headerLines.length - 1; // all lines except last are stereotype/kind
    skeletons.push(
      createText({
        x: x + PADDING_X,
        y: currentY,
        text: headerLines[i],
        fontSize: isStereotype ? 12 : HEADER_FONT_SIZE,
        textAlign: "center",
      }),
    );
    currentY += isStereotype ? 16 : LINE_HEIGHT;
  }

  // Separator line after header
  if (attributes.length > 0 || methods.length > 0) {
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
  }

  // Attributes section
  for (const attr of attributes) {
    skeletons.push(
      createText({
        x: x + PADDING_X,
        y: currentY,
        text: formatMember(attr),
        fontSize: MEMBER_FONT_SIZE,
      }),
    );
    currentY += LINE_HEIGHT;
  }

  // Separator between attributes and methods
  if (attributes.length > 0 && methods.length > 0) {
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
  }

  // Methods section
  for (const method of methods) {
    skeletons.push(
      createText({
        x: x + PADDING_X,
        y: currentY,
        text: formatMember(method),
        fontSize: MEMBER_FONT_SIZE,
      }),
    );
    currentY += LINE_HEIGHT;
  }

  return skeletons;
}

// ── Relation rendering ──────────────────────────────────────────

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

  // Use dagre waypoints if available, clamped to box borders
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

// buildArrowPoints and clampToBoxBorder imported from @drawhaus/helpers

function getArrowStyle(relationType: ClassRelationType): {
  startArrowhead: "arrow" | "triangle" | "diamond" | null;
  endArrowhead: "arrow" | "triangle" | "diamond" | null;
  strokeStyle: "solid" | "dashed";
} {
  switch (relationType) {
    case "inheritance":
      return {
        startArrowhead: null,
        endArrowhead: "triangle",
        strokeStyle: "solid",
      };
    case "inheritance_reverse":
      return {
        startArrowhead: "triangle",
        endArrowhead: null,
        strokeStyle: "solid",
      };
    case "implementation":
      return {
        startArrowhead: null,
        endArrowhead: "triangle",
        strokeStyle: "dashed",
      };
    case "implementation_reverse":
      return {
        startArrowhead: "triangle",
        endArrowhead: null,
        strokeStyle: "dashed",
      };
    case "composition":
      return {
        startArrowhead: null,
        endArrowhead: "diamond",
        strokeStyle: "solid",
      };
    case "composition_reverse":
      return {
        startArrowhead: "diamond",
        endArrowhead: null,
        strokeStyle: "solid",
      };
    case "aggregation":
      return {
        startArrowhead: null,
        endArrowhead: "diamond",
        strokeStyle: "solid",
      };
    case "aggregation_reverse":
      return {
        startArrowhead: "diamond",
        endArrowhead: null,
        strokeStyle: "solid",
      };
    case "directed_association":
      return {
        startArrowhead: null,
        endArrowhead: "arrow",
        strokeStyle: "solid",
      };
    case "directed_association_reverse":
      return {
        startArrowhead: "arrow",
        endArrowhead: null,
        strokeStyle: "solid",
      };
    case "dependency":
      return {
        startArrowhead: null,
        endArrowhead: "arrow",
        strokeStyle: "dashed",
      };
    case "association":
    default:
      return {
        startArrowhead: null,
        endArrowhead: null,
        strokeStyle: "solid",
      };
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function getHeaderLines(entity: ClassEntity): string[] {
  const lines: string[] = [];

  if (entity.stereotype) {
    lines.push(`«${entity.stereotype}»`);
  } else if (entity.kind === "interface") {
    lines.push("«interface»");
  } else if (entity.kind === "enum") {
    lines.push("«enumeration»");
  } else if (entity.kind === "abstract_class") {
    lines.push("«abstract»");
  }

  lines.push(entity.name);
  return lines;
}

function splitMembers(members: ClassMember[]): {
  attributes: ClassMember[];
  methods: ClassMember[];
} {
  const attributes: ClassMember[] = [];
  const methods: ClassMember[] = [];

  for (const m of members) {
    if (m.kind === "method") {
      methods.push(m);
    } else {
      attributes.push(m);
    }
  }

  return { attributes, methods };
}

function formatMember(member: ClassMember): string {
  const vis = member.visibility ?? "";
  const staticPrefix = member.isStatic ? "{static} " : "";
  const abstractPrefix = member.isAbstract ? "{abstract} " : "";

  if (member.kind === "method") {
    const params = member.parameters ?? "";
    const ret = member.type ? `: ${member.type}` : "";
    return `${staticPrefix}${abstractPrefix}${vis}${member.name}(${params})${ret}`;
  }

  if (member.kind === "enum_value") {
    return member.name;
  }

  // attribute
  const type = member.type ? `: ${member.type}` : "";
  return `${staticPrefix}${abstractPrefix}${vis}${member.name}${type}`;
}

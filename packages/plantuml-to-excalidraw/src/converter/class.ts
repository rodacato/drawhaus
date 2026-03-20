import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  ClassDiagramAST,
  ClassEntity,
  ClassMember,
  ClassRelationType,
} from "../parser/types.js";
import type { DiagramTheme, ShapeStyle } from "../theme/types.js";
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

export function mapClassDiagram(
  ast: ClassDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Calculate dimensions for each entity
  const entityDimensions = new Map<string, { width: number; height: number }>();
  for (const entity of ast.entities) {
    const dim = measureEntity(entity, theme);
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

    const entitySkeletons = renderEntity(entity, pos.x, pos.y, theme);
    if (entitySkeletons.length > 0 && entitySkeletons[0].id) {
      entityIds.set(entity.name, entitySkeletons[0].id);
    }
    skeletons.push(...entitySkeletons);
  }

  // Render relations as arrows
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
      theme,
      entityIds.get(rel.left),
      entityIds.get(rel.right),
      edgePoints?.points,
    );
    skeletons.push(arrowSkeleton);
  }

  return skeletons;
}

// ── Entity rendering ────────────────────────────────────────────

function getEntityStyle(kind: ClassEntity["kind"], theme: DiagramTheme): ShapeStyle {
  switch (kind) {
    case "class": return theme.class;
    case "abstract_class": return theme.abstractClass;
    case "interface": return theme.interface;
    case "enum": return theme.enum;
  }
}

interface EntityDimensions {
  width: number;
  height: number;
}

function measureEntity(entity: ClassEntity, theme: DiagramTheme): EntityDimensions {
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

  const stereotypeFontSize = theme.stereotypeText.fontSize;
  const stereotypeLineHeight = stereotypeFontSize + 6;

  let height = PADDING_Y;
  for (let i = 0; i < headerLines.length; i++) {
    height += i < headerLines.length - 1 ? stereotypeLineHeight : LINE_HEIGHT;
  }
  if (attributes.length > 0 || methods.length > 0) {
    height += SECTION_SEPARATOR_HEIGHT;
  }
  if (attributes.length > 0) {
    height += attributes.length * LINE_HEIGHT;
    if (methods.length > 0) {
      height += SECTION_SEPARATOR_HEIGHT;
    }
  }
  if (methods.length > 0) {
    height += methods.length * LINE_HEIGHT;
  }
  height += PADDING_Y;

  return { width: maxLineWidth, height };
}

function renderEntity(
  entity: ClassEntity,
  x: number,
  y: number,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  const dim = measureEntity(entity, theme);
  const headerLines = getHeaderLines(entity);
  const { attributes, methods } = splitMembers(entity.members);

  const style = getEntityStyle(entity.kind, theme);
  const stereotypeFontSize = theme.stereotypeText.fontSize;
  const stereotypeLineHeight = stereotypeFontSize + 6;

  // Center x for centered text
  const centerX = x + dim.width / 2;

  // Main bounding rectangle
  const mainRect = createRect({
    x,
    y,
    width: dim.width,
    height: dim.height,
    backgroundColor: style.fill,
    strokeColor: style.stroke,
    strokeStyle: style.strokeStyle,
  });
  skeletons.push(mainRect);

  let currentY = y + PADDING_Y;

  // Header: stereotype (centered, smaller) + class name (centered, bold)
  for (let i = 0; i < headerLines.length; i++) {
    const isStereotype = i < headerLines.length - 1;
    skeletons.push(
      createText({
        x: centerX,
        y: currentY,
        text: headerLines[i],
        fontSize: isStereotype ? stereotypeFontSize : theme.headerText.fontSize,
        color: isStereotype ? theme.stereotypeText.color : theme.headerText.color,
        textAlign: "center",
      }),
    );
    currentY += isStereotype ? stereotypeLineHeight : LINE_HEIGHT;
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
        strokeColor: theme.separator.stroke,
        strokeWidth: theme.separator.strokeWidth,
      }),
    );
    currentY += SECTION_SEPARATOR_HEIGHT / 2;
  }

  // Attributes section (left-aligned)
  for (const attr of attributes) {
    skeletons.push(
      createText({
        x: x + PADDING_X,
        y: currentY,
        text: formatMember(attr),
        fontSize: theme.memberText.fontSize,
        color: theme.memberText.color,
        textAlign: "left",
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
        strokeColor: theme.separator.stroke,
        strokeWidth: theme.separator.strokeWidth,
      }),
    );
    currentY += SECTION_SEPARATOR_HEIGHT / 2;
  }

  // Methods section (left-aligned)
  for (const method of methods) {
    skeletons.push(
      createText({
        x: x + PADDING_X,
        y: currentY,
        text: formatMember(method),
        fontSize: theme.memberText.fontSize,
        color: theme.memberText.color,
        textAlign: "left",
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

  const type = member.type ? `: ${member.type}` : "";
  return `${staticPrefix}${abstractPrefix}${vis}${member.name}${type}`;
}

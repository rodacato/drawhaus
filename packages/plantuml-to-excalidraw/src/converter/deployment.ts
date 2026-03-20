import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  DeploymentDiagramAST,
  DeploymentNode,
  DeploymentNodeKind,
} from "../parser/types.js";
import type { DiagramTheme, ShapeStyle } from "../theme/types.js";
import { createRect, createText, createArrow } from "../elements.js";
import {
  layoutGraph,
  buildArrowPoints,
  type LayoutNode,
  type LayoutEdge,
} from "@drawhaus/helpers";

// ── Layout constants ────────────────────────────────────────────

const CHAR_WIDTH = 9.5;
const PADDING_X = 20;
const PADDING_Y = 12;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 36;
const CONTAINER_PADDING = 30;
const CONTAINER_HEADER_HEIGHT = 28;

// ── Public API ──────────────────────────────────────────────────

export function mapDeploymentDiagram(
  ast: DeploymentDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Flatten all leaf nodes for layout
  const leafNodes = new Map<string, DeploymentNode>();
  const containerNodes: DeploymentNode[] = [];

  for (const node of ast.nodes) {
    collectNodes(node, leafNodes, containerNodes);
  }

  // Also ensure nodes from relations are in the leaf set
  for (const rel of ast.relations) {
    if (!leafNodes.has(rel.left)) {
      leafNodes.set(rel.left, {
        kind: "node",
        name: rel.left,
        label: null,
        children: [],
      });
    }
    if (!leafNodes.has(rel.right)) {
      leafNodes.set(rel.right, {
        kind: "node",
        name: rel.right,
        label: null,
        children: [],
      });
    }
  }

  // Measure nodes
  const nodeDimensions = new Map<string, { width: number; height: number }>();
  for (const [name, node] of leafNodes) {
    const displayName = node.label ?? name;
    const width = Math.max(
      displayName.length * CHAR_WIDTH + PADDING_X * 2,
      MIN_WIDTH,
    );
    nodeDimensions.set(name, { width, height: MIN_HEIGHT });
  }

  // Build layout
  const layoutNodes: LayoutNode[] = [...leafNodes.keys()].map((id) => ({
    id,
    ...nodeDimensions.get(id)!,
  }));

  const layoutEdges: LayoutEdge[] = ast.relations.map((r, i) => ({
    source: r.left,
    target: r.right,
    id: `rel_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 60, 80);

  // Render containers (bottom to top: largest first)
  for (const container of containerNodes) {
    const els = renderContainer(container, layout, theme);
    skeletons.push(...els);
  }

  // Render leaf nodes
  const elementIds = new Map<string, string>();

  for (const [name, node] of leafNodes) {
    const pos = layout.nodes.get(name);
    if (!pos) continue;

    const displayName = node.label ?? name;
    const dim = nodeDimensions.get(name)!;
    const style = getNodeStyle(node.kind, theme);

    const rect = createRect({
      x: pos.x,
      y: pos.y,
      width: dim.width,
      height: dim.height,
      backgroundColor: style.fill,
      strokeColor: style.stroke,
      strokeStyle: style.strokeStyle,
      roundness: 4,
    });
    elementIds.set(name, rect.id!);
    skeletons.push(rect);

    // Stereotype label above name if it's a special kind
    const kindLabel = getKindLabel(node.kind);
    if (kindLabel) {
      skeletons.push(
        createText({
          x: pos.x + dim.width / 2,
          y: pos.y + 4,
          text: `«${kindLabel}»`,
          fontSize: theme.stereotypeText.fontSize,
          color: theme.stereotypeText.color,
          textAlign: "center",
        }),
      );
      skeletons.push(
        createText({
          x: pos.x + dim.width / 2,
          y: pos.y + PADDING_Y + 8,
          text: displayName,
          fontSize: theme.headerText.fontSize,
          color: theme.headerText.color,
          textAlign: "center",
        }),
      );
    } else {
      skeletons.push(
        createText({
          x: pos.x + dim.width / 2,
          y: pos.y + PADDING_Y,
          text: displayName,
          fontSize: theme.headerText.fontSize,
          color: theme.headerText.color,
          textAlign: "center",
        }),
      );
    }
  }

  // Render relations
  for (let i = 0; i < ast.relations.length; i++) {
    const rel = ast.relations[i];
    const sourcePos = layout.nodes.get(rel.left);
    const targetPos = layout.nodes.get(rel.right);
    if (!sourcePos || !targetPos) continue;

    const edgePoints = layout.edges.get(`rel_${i}`);
    const points = buildArrowPoints(sourcePos, targetPos, edgePoints?.points);

    const isDep = rel.relationType === "dependency";
    const arrowTheme = isDep ? theme.dependencyArrow : theme.arrow;

    skeletons.push(
      createArrow({
        points,
        label: rel.label ?? undefined,
        endArrowhead: rel.relationType === "association" ? null : "arrow",
        strokeStyle: isDep ? "dashed" : "solid",
        strokeColor: arrowTheme.stroke,
        strokeWidth: arrowTheme.strokeWidth,
        startId: elementIds.get(rel.left),
        endId: elementIds.get(rel.right),
      }),
    );
  }

  return skeletons;
}

// ── Node collection ─────────────────────────────────────────────

function collectNodes(
  node: DeploymentNode,
  leafNodes: Map<string, DeploymentNode>,
  containerNodes: DeploymentNode[],
): void {
  if (node.children.length > 0) {
    containerNodes.push(node);
    for (const child of node.children) {
      collectNodes(child, leafNodes, containerNodes);
    }
  } else {
    leafNodes.set(node.name, node);
  }
}

// ── Container rendering ─────────────────────────────────────────

function renderContainer(
  container: DeploymentNode,
  layout: ReturnType<typeof layoutGraph>,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Find bounding box of all descendant leaf nodes
  const leafNames: string[] = [];
  collectLeafNames(container, leafNames);

  if (leafNames.length === 0) return skeletons;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const name of leafNames) {
    const pos = layout.nodes.get(name);
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  if (minX === Infinity) return skeletons;

  const x = minX - CONTAINER_PADDING;
  const y = minY - CONTAINER_PADDING - CONTAINER_HEADER_HEIGHT;
  const width = maxX - minX + CONTAINER_PADDING * 2;
  const height =
    maxY - minY + CONTAINER_PADDING * 2 + CONTAINER_HEADER_HEIGHT;

  skeletons.push(
    createRect({
      x,
      y,
      width,
      height,
      backgroundColor: theme.deploymentContainer.fill,
      strokeColor: theme.deploymentContainer.stroke,
      strokeStyle: theme.deploymentContainer.strokeStyle,
    }),
  );

  const kindLabel = getKindLabel(container.kind);
  const prefix = kindLabel ? `«${kindLabel}» ` : "";
  const displayName = container.label ?? container.name;

  skeletons.push(
    createText({
      x: x + PADDING_X,
      y: y + 6,
      text: `${prefix}${displayName}`,
      fontSize: theme.stereotypeText.fontSize,
      color: theme.stereotypeText.color,
      textAlign: "left",
    }),
  );

  return skeletons;
}

function collectLeafNames(node: DeploymentNode, names: string[]): void {
  if (node.children.length === 0) {
    names.push(node.name);
  } else {
    for (const child of node.children) {
      collectLeafNames(child, names);
    }
  }
}

// ── Styling ─────────────────────────────────────────────────────

function getNodeStyle(kind: DeploymentNodeKind, theme: DiagramTheme): ShapeStyle {
  switch (kind) {
    case "database":
      return theme.deploymentDatabase;
    case "artifact":
    case "card":
    case "storage":
      return theme.deploymentArtifact;
    case "cloud":
    case "folder":
    case "frame":
    case "package":
    case "rectangle":
      return theme.deploymentContainer;
    default:
      return theme.deploymentNode;
  }
}

function getKindLabel(kind: DeploymentNodeKind): string | null {
  switch (kind) {
    case "artifact":
      return "artifact";
    case "cloud":
      return "cloud";
    case "database":
      return "database";
    case "folder":
      return "folder";
    case "frame":
      return "frame";
    case "queue":
      return "queue";
    case "stack":
      return "stack";
    case "storage":
      return "storage";
    case "card":
      return "card";
    case "agent":
      return "agent";
    case "person":
      return "person";
    case "node":
    case "component":
    case "package":
    case "rectangle":
    case "actor":
      return null;
  }
}

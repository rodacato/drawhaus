import type { ExcalidrawElementSkeleton } from "../types.js";
import type {
  ComponentDiagramAST,
  ComponentContainer,
  ComponentRelationType,
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
const PADDING_X = 20;
const PADDING_Y = 12;
const MIN_WIDTH = 130;
const MIN_HEIGHT = 36;
const CONTAINER_PADDING = 30;
const CONTAINER_HEADER_HEIGHT = 28;
const INTERFACE_SIZE = 20;

// ── Public API ──────────────────────────────────────────────────

export function mapComponentDiagram(
  ast: ComponentDiagramAST,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Build a map of component name → container name
  const componentContainerMap = new Map<string, string>();
  for (const container of ast.containers) {
    mapComponentsToContainer(container, container.name, componentContainerMap);
  }

  // Collect all node names for layout (components + interfaces)
  const allNames = new Set<string>();
  for (const c of ast.components) {
    allNames.add(c.alias ?? c.name);
  }
  for (const iface of ast.interfaces) {
    allNames.add(iface.alias ?? iface.name);
  }
  for (const r of ast.relations) {
    allNames.add(r.left);
    allNames.add(r.right);
  }

  // Measure nodes
  const nodeDimensions = new Map<string, { width: number; height: number }>();
  const componentNameMap = buildComponentNameMap(ast);

  for (const name of allNames) {
    const isInterface = ast.interfaces.some(
      (i) => (i.alias ?? i.name) === name,
    );
    if (isInterface) {
      nodeDimensions.set(name, {
        width: INTERFACE_SIZE,
        height: INTERFACE_SIZE,
      });
    } else {
      const displayName = componentNameMap.get(name) ?? name;
      const width = Math.max(
        displayName.length * CHAR_WIDTH + PADDING_X * 2,
        MIN_WIDTH,
      );
      nodeDimensions.set(name, { width, height: MIN_HEIGHT });
    }
  }

  // Build layout graph
  const layoutNodes: LayoutNode[] = [...allNames].map((id) => ({
    id,
    ...nodeDimensions.get(id)!,
  }));

  const layoutEdges: LayoutEdge[] = ast.relations.map((r, i) => ({
    source: r.left,
    target: r.right,
    id: `rel_${i}`,
  }));

  const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 60, 80);

  // Render containers first (as background rectangles)
  for (const container of ast.containers) {
    const containerEls = renderContainer(
      container,
      layout,
      componentContainerMap,
      theme,
    );
    skeletons.push(...containerEls);
  }

  // Render each component/interface
  const elementIds = new Map<string, string>();

  for (const name of allNames) {
    const pos = layout.nodes.get(name);
    if (!pos) continue;

    const isInterface = ast.interfaces.some(
      (i) => (i.alias ?? i.name) === name,
    );

    if (isInterface) {
      const el = createEllipse({
        x: pos.x,
        y: pos.y,
        width: INTERFACE_SIZE,
        height: INTERFACE_SIZE,
        backgroundColor: theme.componentInterface.fill,
        strokeColor: theme.componentInterface.stroke,
      });
      elementIds.set(name, el.id!);
      skeletons.push(el);

      const displayName =
        ast.interfaces.find((i) => (i.alias ?? i.name) === name)?.name ?? name;
      skeletons.push(
        createText({
          x: pos.x + INTERFACE_SIZE / 2,
          y: pos.y + INTERFACE_SIZE + 4,
          text: displayName,
          fontSize: theme.memberText.fontSize,
          color: theme.memberText.color,
          textAlign: "center",
        }),
      );
    } else {
      const displayName = componentNameMap.get(name) ?? name;
      const dim = nodeDimensions.get(name)!;

      const rect = createRect({
        x: pos.x,
        y: pos.y,
        width: dim.width,
        height: dim.height,
        backgroundColor: theme.component.fill,
        strokeColor: theme.component.stroke,
        strokeStyle: theme.component.strokeStyle,
        roundness: 4,
      });
      elementIds.set(name, rect.id!);
      skeletons.push(rect);

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

    const { strokeStyle, isDependency } = getArrowStyle(rel.relationType);
    const arrowTheme = isDependency ? theme.dependencyArrow : theme.arrow;

    skeletons.push(
      createArrow({
        points,
        label: rel.label ?? undefined,
        endArrowhead: rel.relationType === "association" ? null : "arrow",
        strokeStyle,
        strokeColor: arrowTheme.stroke,
        strokeWidth: arrowTheme.strokeWidth,
        startId: elementIds.get(rel.left),
        endId: elementIds.get(rel.right),
      }),
    );
  }

  return skeletons;
}

// ── Container rendering ─────────────────────────────────────────

function renderContainer(
  container: ComponentContainer,
  layout: ReturnType<typeof layoutGraph>,
  componentContainerMap: Map<string, string>,
  theme: DiagramTheme,
): ExcalidrawElementSkeleton[] {
  const skeletons: ExcalidrawElementSkeleton[] = [];

  // Find bounding box of all children in this container
  const childNames: string[] = [];
  collectChildNames(container, childNames);

  if (childNames.length === 0) return skeletons;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const name of childNames) {
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
  const height = maxY - minY + CONTAINER_PADDING * 2 + CONTAINER_HEADER_HEIGHT;

  // Container rectangle
  skeletons.push(
    createRect({
      x,
      y,
      width,
      height,
      backgroundColor: theme.componentContainer.fill,
      strokeColor: theme.componentContainer.stroke,
      strokeStyle: theme.componentContainer.strokeStyle,
    }),
  );

  // Container label with kind prefix
  const kindLabel = container.kind === "rectangle" ? "" : `«${container.kind}» `;
  skeletons.push(
    createText({
      x: x + PADDING_X,
      y: y + 6,
      text: `${kindLabel}${container.name}`,
      fontSize: theme.stereotypeText.fontSize,
      color: theme.stereotypeText.color,
      textAlign: "left",
    }),
  );

  // Render nested child containers
  for (const child of container.childContainers) {
    skeletons.push(
      ...renderContainer(child, layout, componentContainerMap, theme),
    );
  }

  return skeletons;
}

// ── Helpers ─────────────────────────────────────────────────────

function mapComponentsToContainer(
  container: ComponentContainer,
  containerName: string,
  map: Map<string, string>,
): void {
  for (const child of container.children) {
    map.set(child.alias ?? child.name, containerName);
  }
  for (const child of container.childContainers) {
    mapComponentsToContainer(child, child.name, map);
  }
}

function collectChildNames(
  container: ComponentContainer,
  names: string[],
): void {
  for (const child of container.children) {
    names.push(child.alias ?? child.name);
  }
  for (const child of container.childContainers) {
    collectChildNames(child, names);
  }
}

function buildComponentNameMap(
  ast: ComponentDiagramAST,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of ast.components) {
    const key = c.alias ?? c.name;
    map.set(key, c.name);
  }
  return map;
}

function getArrowStyle(relationType: ComponentRelationType): {
  strokeStyle: "solid" | "dashed";
  isDependency: boolean;
} {
  switch (relationType) {
    case "dependency":
      return { strokeStyle: "dashed", isDependency: true };
    case "directed":
    case "provided":
    case "required":
      return { strokeStyle: "solid", isDependency: false };
    case "association":
    default:
      return { strokeStyle: "solid", isDependency: false };
  }
}

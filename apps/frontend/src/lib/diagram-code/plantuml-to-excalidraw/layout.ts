import dagre from "dagre";

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  id?: string;
}

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgePosition {
  points: Array<{ x: number; y: number }>;
}

export interface LayoutResult {
  nodes: Map<string, NodePosition>;
  edges: Map<string, EdgePosition>;
}

export function layoutGraph(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: "TB" | "LR" = "TB",
  nodeSpacing = 80,
  rankSpacing = 120,
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 40,
    marginy: 40,
    edgesep: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, {
      id: edge.id,
      minlen: 1,
      weight: 1,
    });
  }

  dagre.layout(g);

  const nodePositions = new Map<string, NodePosition>();
  for (const nodeId of g.nodes()) {
    const pos = g.node(nodeId);
    if (pos) {
      // dagre returns center coordinates; convert to top-left
      nodePositions.set(nodeId, {
        x: pos.x - pos.width / 2,
        y: pos.y - pos.height / 2,
        width: pos.width,
        height: pos.height,
      });
    }
  }

  const edgePositions = new Map<string, EdgePosition>();
  for (const edge of g.edges()) {
    const edgeData = g.edge(edge);
    if (edgeData) {
      const key = edgeData.id ?? `${edge.v}->${edge.w}`;
      edgePositions.set(key, {
        points: edgeData.points ?? [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      });
    }
  }

  return { nodes: nodePositions, edges: edgePositions };
}

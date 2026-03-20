/**
 * Parser for Mermaid flowchart/graph syntax → FlowchartAST.
 *
 * Handles:
 * - Node definitions with 8 shape types
 * - Edge definitions with 3 styles (solid, dotted, thick)
 * - Edge labels (|text| and --text-->)
 * - Subgraphs (including nested)
 * - Chain syntax (A --> B --> C)
 * - Direction (TD, TB, LR, RL, BT)
 */

import type {
  FlowchartAST,
  FlowNode,
  FlowEdge,
  SubGraph,
  Direction,
  NodeShape,
  EdgeStyle,
} from "./flowchart-types.js";

// ── Node shape detection ──────────────────────────────────────

interface ShapeMatch {
  shape: NodeShape;
  /** Regex: group 1 = label text */
  open: string;
  close: string;
}

// Order matters: longer/more-specific patterns first
const SHAPE_PATTERNS: ShapeMatch[] = [
  { shape: "stadium",     open: "([", close: "])" },
  { shape: "subroutine",  open: "[[", close: "]]" },
  { shape: "database",    open: "[(", close: ")]" },
  { shape: "circle",      open: "((", close: "))" },
  { shape: "hexagon",     open: "{{", close: "}}" },
  { shape: "diamond",     open: "{",  close: "}" },
  { shape: "rounded",     open: "(",  close: ")" },
  { shape: "asymmetric",  open: ">",  close: "]" },
  { shape: "rectangle",   open: "[",  close: "]" },
];

function parseNodeDef(raw: string): { id: string; node: FlowNode } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  for (const pat of SHAPE_PATTERNS) {
    const openIdx = trimmed.indexOf(pat.open);
    if (openIdx <= 0) continue;

    const id = trimmed.slice(0, openIdx).trim();
    // Validate id (alphanumeric, _, -)
    if (!/^[\w-]+$/.test(id)) continue;

    const afterOpen = openIdx + pat.open.length;
    const closeIdx = trimmed.lastIndexOf(pat.close);

    if (closeIdx <= afterOpen) continue;

    // Verify that closing pattern is at the end (allow trailing whitespace)
    const afterClose = trimmed.slice(closeIdx + pat.close.length).trim();
    if (afterClose !== "") continue;

    const label = trimmed.slice(afterOpen, closeIdx).trim();

    return {
      id,
      node: { id, label: label || id, shape: pat.shape },
    };
  }

  // Plain node (just an ID, no shape definition)
  if (/^[\w-]+$/.test(trimmed)) {
    return {
      id: trimmed,
      node: { id: trimmed, label: trimmed, shape: "rectangle" },
    };
  }

  return null;
}

// ── Edge parsing ──────────────────────────────────────────────

interface EdgeMatch {
  pattern: RegExp;
  style: EdgeStyle;
  hasArrow: boolean;
  /** Group index for inline label (0 = no inline label) */
  labelGroup: number;
}

// Edge patterns to try, in order (most specific first)
// These match just the arrow part between nodes
const EDGE_PATTERNS: EdgeMatch[] = [
  // Thick with text: ==text==>
  { pattern: /^==([^=]*)==>$/, style: "thick", hasArrow: true, labelGroup: 1 },
  // Thick no text: ==>
  { pattern: /^==>$/, style: "thick", hasArrow: true, labelGroup: 0 },
  // Thick no arrow: ===
  { pattern: /^===$/, style: "thick", hasArrow: false, labelGroup: 0 },
  // Dotted with text: -.text.->
  { pattern: /^-\.(.+)\.-+>$/, style: "dotted", hasArrow: true, labelGroup: 1 },
  // Dotted arrow: -.->
  { pattern: /^-\.+-+>$/, style: "dotted", hasArrow: true, labelGroup: 0 },
  // Dotted no arrow: -.-
  { pattern: /^-\.+-$/, style: "dotted", hasArrow: false, labelGroup: 0 },
  // Solid with text: --text-->
  { pattern: /^--([^-].+)-->$/, style: "solid", hasArrow: true, labelGroup: 1 },
  // Solid arrow: -->
  { pattern: /^-+->$/, style: "solid", hasArrow: true, labelGroup: 0 },
  // Solid no arrow: ---
  { pattern: /^-{2,}$/, style: "solid", hasArrow: false, labelGroup: 0 },
];

function matchEdge(arrowStr: string): { style: EdgeStyle; hasArrow: boolean; inlineLabel: string | null } | null {
  for (const ep of EDGE_PATTERNS) {
    const m = arrowStr.match(ep.pattern);
    if (m) {
      const inlineLabel = ep.labelGroup > 0 && m[ep.labelGroup]
        ? m[ep.labelGroup].trim()
        : null;
      return { style: ep.style, hasArrow: ep.hasArrow, inlineLabel };
    }
  }
  return null;
}

// ── Line tokenizer ────────────────────────────────────────────

// Split a line into tokens: node definitions and edges
// Handles chains like: A[Start] --> B{Decision} -->|Yes| C[OK]
function tokenizeLine(
  line: string,
  nodeMap: Map<string, FlowNode>,
  edges: FlowEdge[],
) {
  // Regex to split on edge arrows while preserving them
  // We look for patterns like -->, --->, -.-> , ==>, etc.
  // Also handle |label| after arrow
  const tokens: string[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    remaining = remaining.trimStart();
    if (!remaining) break;

    // Try to match an edge arrow at current position
    const edgeMatch = remaining.match(
      /^(-+->|--[^-].*?-->|={2,}>|==.*?==>|-\.+->|-\..*?\.-+>|-{2,}|={2,}|-\.+-)/,
    );

    if (edgeMatch) {
      tokens.push(edgeMatch[0]);
      remaining = remaining.slice(edgeMatch[0].length);

      // Check for |label| immediately after arrow
      const labelMatch = remaining.match(/^\|([^|]*)\|/);
      if (labelMatch) {
        // Attach label to the last token
        tokens[tokens.length - 1] += labelMatch[0];
        remaining = remaining.slice(labelMatch[0].length);
      }
      continue;
    }

    // Otherwise consume until next edge arrow or end
    // Find the next arrow start
    const nextArrow = remaining.search(/\s+(-{2,}|={2,}|-\.)/);
    if (nextArrow > 0) {
      tokens.push(remaining.slice(0, nextArrow).trim());
      remaining = remaining.slice(nextArrow);
    } else {
      tokens.push(remaining.trim());
      remaining = "";
    }
  }

  // Process tokens: alternate between node refs and edges
  let lastNodeId: string | null = null;

  for (const token of tokens) {
    // Check if it's an edge (with possible |label|)
    let edgePart = token;
    let pipeLabel: string | null = null;

    const pipeLabelMatch = token.match(/^(.*?)\|([^|]*)\|$/);
    if (pipeLabelMatch) {
      edgePart = pipeLabelMatch[1];
      pipeLabel = pipeLabelMatch[2].trim();
    }

    const edgeInfo = matchEdge(edgePart);
    if (edgeInfo && lastNodeId) {
      // This is an edge — we need the next node
      // Store edge info temporarily
      edges.push({
        sourceId: lastNodeId,
        targetId: "__PENDING__",
        label: pipeLabel || edgeInfo.inlineLabel,
        style: edgeInfo.style,
        hasArrow: edgeInfo.hasArrow,
      });
      continue;
    }

    // It's a node reference
    const parsed = parseNodeDef(token);
    if (parsed) {
      // Register/update node
      if (!nodeMap.has(parsed.id)) {
        nodeMap.set(parsed.id, parsed.node);
      } else if (parsed.node.label !== parsed.id) {
        // Update label if this definition has a real label
        nodeMap.get(parsed.id)!.label = parsed.node.label;
        nodeMap.get(parsed.id)!.shape = parsed.node.shape;
      }

      // Connect pending edge
      const lastEdge = edges[edges.length - 1];
      if (lastEdge && lastEdge.targetId === "__PENDING__") {
        lastEdge.targetId = parsed.id;
      }

      lastNodeId = parsed.id;
    }
  }
}

// ── Main parser ───────────────────────────────────────────────

export function parseMermaidFlowchart(definition: string): FlowchartAST {
  const lines = definition.split("\n");
  let i = 0;

  // Parse header: flowchart/graph + direction
  let direction: Direction = "TD";
  const headerMatch = lines[0]?.trim().match(/^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\s*$/i);
  if (headerMatch) {
    direction = headerMatch[1].toUpperCase() as Direction;
    if (direction === "TD") direction = "TB";
    i = 1;
  } else if (/^(?:flowchart|graph)\b/i.test(lines[0]?.trim() ?? "")) {
    i = 1;
  }

  const nodeMap = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const subGraphs: SubGraph[] = [];
  const subGraphStack: SubGraph[] = [];

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    if (!line || line.startsWith("%%") || line.startsWith("style ") || line.startsWith("linkStyle ") || line.startsWith("classDef ") || line.startsWith("class ")) continue;

    // Subgraph start
    const subgraphMatch = line.match(/^subgraph\s+(.+?)(?:\s*\[(.+?)\])?\s*$/);
    if (subgraphMatch) {
      const id = subgraphMatch[1].trim();
      const label = subgraphMatch[2]?.trim() || id;
      const sg: SubGraph = {
        id,
        label,
        nodeIds: [],
        childSubGraphIds: [],
      };
      // If we're inside a parent subgraph, register as child
      if (subGraphStack.length > 0) {
        subGraphStack[subGraphStack.length - 1].childSubGraphIds.push(sg.id);
      }
      subGraphStack.push(sg);
      continue;
    }

    // Subgraph end
    if (line === "end") {
      const sg = subGraphStack.pop();
      if (sg) {
        subGraphs.push(sg);
      }
      continue;
    }

    // Direction inside subgraph
    if (/^direction\s+(TB|TD|BT|LR|RL)$/i.test(line)) continue;

    // Tokenize the line for nodes and edges
    const edgesBeforeCount = edges.length;
    tokenizeLine(line, nodeMap, edges);

    // Track which nodes belong to current subgraph
    if (subGraphStack.length > 0) {
      const currentSg = subGraphStack[subGraphStack.length - 1];
      // Any new nodes referenced in this line belong to this subgraph
      for (let e = edgesBeforeCount; e < edges.length; e++) {
        const edge = edges[e];
        if (!currentSg.nodeIds.includes(edge.sourceId)) {
          currentSg.nodeIds.push(edge.sourceId);
        }
        if (edge.targetId !== "__PENDING__" && !currentSg.nodeIds.includes(edge.targetId)) {
          currentSg.nodeIds.push(edge.targetId);
        }
      }
      // Also check for standalone node definitions (no edges created)
      if (edges.length === edgesBeforeCount) {
        const parsed = parseNodeDef(line);
        if (parsed && !currentSg.nodeIds.includes(parsed.id)) {
          currentSg.nodeIds.push(parsed.id);
        }
      }
    }
  }

  // Remove any edges with unresolved targets
  const validEdges = edges.filter((e) => e.targetId !== "__PENDING__");

  return {
    direction,
    nodes: Array.from(nodeMap.values()),
    edges: validEdges,
    subGraphs,
  };
}

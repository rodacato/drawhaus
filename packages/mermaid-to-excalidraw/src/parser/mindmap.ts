/**
 * Regex-based parser for Mermaid mindmap diagrams.
 *
 * Handles:
 *  - Indentation-based tree hierarchy
 *  - Node shapes: [square], (rounded), ((circle)), ))bang((, )cloud(, {{hexagon}}, default
 *  - ::icon() syntax (stored but not rendered)
 *  - :::className syntax (stripped)
 *  - Single root node requirement
 */

import type {
  MindmapAST,
  MindmapNode,
  MindmapShape,
} from "./mindmap-types.js";

// ── Shape patterns (order by specificity) ────────────────────────

const SHAPE_PATTERNS: Array<{ re: RegExp; shape: MindmapShape }> = [
  { re: /^\(\((.+?)\)\)$/, shape: "circle" },
  { re: /^\)\)(.+?)\(\($/, shape: "bang" },
  { re: /^\{\{(.+?)\}\}$/, shape: "hexagon" },
  { re: /^\[(.+?)\]$/, shape: "square" },
  { re: /^\((.+?)\)$/, shape: "rounded" },
  { re: /^\)(.+?)\($/, shape: "cloud" },
];

let nodeCounter = 0;

// ── Parser ───────────────────────────────────────────────────────

export function parseMermaidMindmap(definition: string): MindmapAST {
  nodeCounter = 0;
  const lines = definition.split("\n");

  // Skip header line
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^mindmap\s*$/i.test(trimmed)) {
      startIdx = i + 1;
      break;
    }
    if (trimmed !== "" && !trimmed.startsWith("%%")) {
      startIdx = i;
      break;
    }
  }

  // Parse content lines into flat list with indentation levels
  const entries: Array<{ indent: number; label: string; shape: MindmapShape; icon?: string }> = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("%%")) continue;

    // Calculate indentation (number of leading spaces)
    const indent = line.search(/\S/);
    if (indent < 0) continue;

    let content = line.trim();

    // Strip :::className
    content = content.replace(/:::\w+/g, "").trim();

    // Extract ::icon(...)
    let icon: string | undefined;
    const iconMatch = content.match(/::icon\(([^)]+)\)/);
    if (iconMatch) {
      icon = iconMatch[1];
      content = content.replace(/::icon\([^)]+\)/, "").trim();
    }

    // Detect shape
    const { label, shape } = parseNodeContent(content);

    entries.push({ indent, label, shape, icon });
  }

  if (entries.length === 0) {
    return { root: null };
  }

  // Build tree from flat indent-based list
  const root = buildTree(entries);

  return { root };
}

function parseNodeContent(content: string): { label: string; shape: MindmapShape } {
  // First try exact match (entire content is a shape)
  for (const { re, shape } of SHAPE_PATTERNS) {
    const match = content.match(re);
    if (match) {
      return { label: match[1], shape };
    }
  }

  // Then try suffix match: "id((label))" or "id[label]" etc.
  // Mermaid allows prefixing shape with an ID
  for (const { re, shape } of SHAPE_PATTERNS) {
    // Build a regex that allows a prefix word before the shape
    const suffixRe = new RegExp(`^\\w+${re.source.slice(1)}$`);
    // Actually, simpler: find the shape delimiters anywhere
    const source = re.source;
    // Extract the opening/closing delimiters pattern
    const innerRe = new RegExp(source.replace("^", "").replace("$", ""));
    const innerMatch = content.match(innerRe);
    if (innerMatch) {
      return { label: innerMatch[1], shape };
    }
  }

  return { label: content, shape: "default" };
}

function buildTree(
  entries: Array<{ indent: number; label: string; shape: MindmapShape; icon?: string }>,
): MindmapNode {
  const root = makeNode(entries[0]);

  // Stack tracks [node, indent] for parent lookup
  const stack: Array<{ node: MindmapNode; indent: number }> = [
    { node: root, indent: entries[0].indent },
  ];

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const newNode = makeNode(entry);

    // Pop stack until we find a parent with smaller indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= entry.indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(newNode);
    stack.push({ node: newNode, indent: entry.indent });
  }

  return root;
}

function makeNode(entry: { label: string; shape: MindmapShape; icon?: string }): MindmapNode {
  return {
    id: `mm_${++nodeCounter}`,
    label: entry.label,
    shape: entry.shape,
    level: 0, // will be set during layout
    children: [],
    ...(entry.icon ? { icon: entry.icon } : {}),
  };
}

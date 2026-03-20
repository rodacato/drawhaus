import type { MermaidTheme } from "./types.js";

/**
 * Default theme — same visual language as the PlantUML converter
 * for consistency across drawhaus diagram packages.
 */
export const DEFAULT_THEME: MermaidTheme = {
  // ── Class Diagram ──────────────────────────────
  class: {
    fill: "#f0f4f8",       // very light blue-grey
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  abstractClass: {
    fill: "#f4f0f7",       // very light lavender
    stroke: "#9678b6",
    strokeStyle: "solid",
  },
  interface: {
    fill: "#f0f5f0",       // very light sage
    stroke: "#6da670",
    strokeStyle: "dashed",
  },
  enumeration: {
    fill: "#f5f3ee",       // very light warm grey
    stroke: "#c4a94d",
    strokeStyle: "solid",
  },

  // ── Flowchart ─────────────────────────────────
  flowNode: {
    fill: "#f0f4f8",         // light blue-grey (process nodes)
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  flowDecision: {
    fill: "#f5f3ee",         // warm grey (decision diamonds)
    stroke: "#c4a94d",
    strokeStyle: "solid",
  },
  flowDatabase: {
    fill: "#f0f5f0",         // light sage (data stores)
    stroke: "#6da670",
    strokeStyle: "solid",
  },
  flowCircle: {
    fill: "#f4f0f7",         // light lavender (terminators)
    stroke: "#9678b6",
    strokeStyle: "solid",
  },
  flowSubgraph: {
    fill: "transparent",
    stroke: "#8e9baa",       // muted blue-grey
    strokeStyle: "dashed",
  },

  // ── Relations ──────────────────────────────────
  arrow: {
    stroke: "#555555",
    strokeWidth: 1,
  },
  dependencyArrow: {
    stroke: "#888888",
    strokeWidth: 1,
  },
  thickArrow: {
    stroke: "#444444",
    strokeWidth: 2,
  },

  // ── Typography ─────────────────────────────────
  headerText: {
    color: "#1a1a1a",
    fontSize: 16,
  },
  memberText: {
    color: "#333333",
    fontSize: 14,
  },
  stereotypeText: {
    color: "#666666",
    fontSize: 12,
  },
  labelText: {
    color: "#555555",
    fontSize: 12,
  },
  nodeText: {
    color: "#1a1a1a",
    fontSize: 14,
  },

  // ── Separators ─────────────────────────────────
  separator: {
    stroke: "#cccccc",
    strokeWidth: 1,
  },
};

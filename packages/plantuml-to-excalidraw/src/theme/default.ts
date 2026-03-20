import type { DiagramTheme } from "./types.js";

/**
 * Default theme — subtle, low-contrast backgrounds that distinguish
 * entity kinds at a glance without being visually aggressive.
 *
 * Backgrounds are barely-there tints over a neutral base so diagrams
 * look clean on both light and dark Excalidraw canvases.
 */
export const DEFAULT_THEME: DiagramTheme = {
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
  enum: {
    fill: "#f5f3ee",       // very light warm grey
    stroke: "#c4a94d",
    strokeStyle: "solid",
  },

  // ── Object Diagram ─────────────────────────────
  object: {
    fill: "#f0f4f8",       // very light blue-grey
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  map: {
    fill: "#f5f3ee",       // very light warm grey
    stroke: "#c4a94d",
    strokeStyle: "solid",
  },

  // ── Use Case Diagram ──────────────────────────
  actor: {
    fill: "#f0f1f5",       // very light indigo-grey
    stroke: "#6872a8",
    strokeStyle: "solid",
  },
  useCase: {
    fill: "#f4f0f7",       // very light lavender
    stroke: "#9678b6",
    strokeStyle: "solid",
  },
  boundary: {
    fill: "transparent",
    stroke: "#8e9baa",     // muted blue-grey
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

  // ── Separators ─────────────────────────────────
  separator: {
    stroke: "#cccccc",
    strokeWidth: 1,
  },
};

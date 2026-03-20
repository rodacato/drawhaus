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

  // ── Deployment Diagram ─────────────────────────
  deploymentNode: {
    fill: "#f0f4f8",         // very light blue-grey
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  deploymentContainer: {
    fill: "#f8f9fb",         // barely-there grey
    stroke: "#8e9baa",
    strokeStyle: "dashed",
  },
  deploymentArtifact: {
    fill: "#f5f3ee",         // warm grey
    stroke: "#c4a94d",
    strokeStyle: "solid",
  },
  deploymentDatabase: {
    fill: "#f0f5f0",         // very light sage
    stroke: "#6da670",
    strokeStyle: "solid",
  },

  // ── Component Diagram ──────────────────────────
  component: {
    fill: "#f0f4f8",         // very light blue-grey
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  componentContainer: {
    fill: "#f8f9fb",         // barely-there grey
    stroke: "#8e9baa",
    strokeStyle: "dashed",
  },
  componentInterface: {
    fill: "#f0f5f0",         // very light sage
    stroke: "#6da670",
    strokeStyle: "solid",
  },

  // ── State Diagram ───────────────────────────────
  state: {
    fill: "#f0f4f8",         // very light blue-grey (same as class)
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  compositeState: {
    fill: "#f8f9fb",         // barely-there grey
    stroke: "#8e9baa",
    strokeStyle: "solid",
  },
  startEnd: {
    fill: "#333333",         // filled dark circle
    stroke: "#333333",
    strokeStyle: "solid",
  },
  choiceState: {
    fill: "#f5f3ee",         // warm grey (same as enum)
    stroke: "#c4a94d",
    strokeStyle: "solid",
  },
  forkJoin: {
    fill: "#333333",         // filled dark bar
    stroke: "#333333",
    strokeStyle: "solid",
  },

  // ── Sequence Diagram ──────────────────────────
  sequenceParticipant: {
    fill: "#f0f4f8",         // very light blue-grey
    stroke: "#5b8fc9",
    strokeStyle: "solid",
  },
  sequenceLifeline: {
    stroke: "#bbbbbb",
    strokeWidth: 1,
  },
  sequenceMessage: {
    stroke: "#555555",
    strokeWidth: 1,
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

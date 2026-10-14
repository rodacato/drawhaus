import type { SaveState } from "./types";

const SAVE_LABELS: Record<SaveState, string> = {
  idle: "Ready",
  pending: "Unsaved",
  saving: "Saving...",
  saved: "Saved",
  error: "Error",
};

const SAVE_COLORS: Record<SaveState, string> = {
  idle: "bg-surface-raised/90 text-text-secondary ring-1 ring-border",
  pending: "bg-surface-raised/90 text-warning ring-1 ring-warning/30",
  saving: "bg-surface-raised/90 text-info ring-1 ring-info/30",
  saved: "bg-surface-raised/90 text-success ring-1 ring-success/30",
  error: "bg-surface-raised/90 text-error ring-1 ring-error/30",
};

export function deriveSaveLabel(state: SaveState, lastSavedAt: string | null): string {
  if (state === "saved" && lastSavedAt) return `Saved ${lastSavedAt}`;
  return SAVE_LABELS[state];
}

export function deriveSaveColor(state: SaveState): string {
  return SAVE_COLORS[state];
}

const CURSOR_STALE_MS = 5000;

export function isCursorStale(
  lastSeen: number,
  now: number,
  thresholdMs = CURSOR_STALE_MS,
): boolean {
  return now - lastSeen >= thresholdMs;
}

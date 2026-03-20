import type { SaveState } from "./types";

const SAVE_LABELS: Record<SaveState, string> = {
  idle: "Ready",
  pending: "Unsaved",
  saving: "Saving...",
  saved: "Saved",
  error: "Error",
};

const SAVE_COLORS: Record<SaveState, string> = {
  idle: "bg-white/80 text-black/50",
  pending: "bg-amber-100 text-amber-700",
  saving: "bg-blue-100 text-blue-700",
  saved: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

export function deriveSaveLabel(state: SaveState, lastSavedAt: string | null): string {
  if (state === "saved" && lastSavedAt) return `Saved ${lastSavedAt}`;
  return SAVE_LABELS[state];
}

export function deriveSaveColor(state: SaveState): string {
  return SAVE_COLORS[state];
}

const CURSOR_STALE_MS = 5000;

export function isCursorStale(lastSeen: number, now: number, thresholdMs = CURSOR_STALE_MS): boolean {
  return now - lastSeen >= thresholdMs;
}

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasPrefs } from "../lib/hooks/useCanvasPrefs";

const STORAGE_KEY = "drawhaus_canvas_prefs";
const DEFAULTS = {
  gridModeEnabled: true,
  gridSize: 10,
  viewBackgroundColor: "#f8f9fc",
  objectsSnapModeEnabled: true,
};

describe("useCanvasPrefs", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  test("returns defaults when nothing is stored", () => {
    const { result } = renderHook(() => useCanvasPrefs());
    expect(result.current.prefs).toEqual(DEFAULTS);
  });

  test("merges stored prefs over the defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ gridSize: 25, gridModeEnabled: false }));
    const { result } = renderHook(() => useCanvasPrefs());

    expect(result.current.prefs).toEqual({ ...DEFAULTS, gridSize: 25, gridModeEnabled: false });
  });

  test("falls back to defaults when stored JSON is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const { result } = renderHook(() => useCanvasPrefs());

    expect(result.current.prefs).toEqual(DEFAULTS);
  });

  test("updatePrefs patches state and persists to localStorage", () => {
    const { result } = renderHook(() => useCanvasPrefs());

    act(() => result.current.updatePrefs({ gridSize: 40 }));

    expect(result.current.prefs.gridSize).toBe(40);
    expect(result.current.prefs.gridModeEnabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ gridSize: 40 });
  });

  test("updatePrefs still updates state when persistence throws (quota)", () => {
    const { result } = renderHook(() => useCanvasPrefs());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });

    act(() => result.current.updatePrefs({ viewBackgroundColor: "#000000" }));

    expect(result.current.prefs.viewBackgroundColor).toBe("#000000");
  });
});

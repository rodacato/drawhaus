import { describe, test, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInlineRename } from "../lib/hooks/useInlineRename";

describe("useInlineRename", () => {
  test("starts not renaming with initial title as value", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("My Diagram", onRename, "d1"));
    expect(result.current.renaming).toBe(false);
    expect(result.current.renameValue).toBe("My Diagram");
  });

  test("falls back to 'Untitled' when initial title is empty", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("", onRename, "d1"));
    expect(result.current.renameValue).toBe("Untitled");
  });

  test("startRenaming flips state and resets value to initial title", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d1"));
    act(() => {
      result.current.setRenameValue("Changed");
    });
    expect(result.current.renameValue).toBe("Changed");
    act(() => {
      result.current.startRenaming();
    });
    expect(result.current.renaming).toBe(true);
    expect(result.current.renameValue).toBe("Original");
  });

  test("commitRename calls onRename with trimmed value and exits edit mode", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d42"));
    act(() => {
      result.current.startRenaming();
    });
    act(() => {
      result.current.setRenameValue("  New title  ");
    });
    act(() => {
      result.current.commitRename();
    });
    expect(onRename).toHaveBeenCalledWith("d42", "  New title  ");
    expect(result.current.renaming).toBe(false);
  });

  test("commitRename does not call onRename when value is whitespace-only but still exits edit mode", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d1"));
    act(() => {
      result.current.startRenaming();
    });
    act(() => {
      result.current.setRenameValue("   ");
    });
    act(() => {
      result.current.commitRename();
    });
    expect(onRename).not.toHaveBeenCalled();
    expect(result.current.renaming).toBe(false);
  });

  test("cancelRename exits edit mode without calling onRename", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d1"));
    act(() => {
      result.current.startRenaming();
    });
    act(() => {
      result.current.cancelRename();
    });
    expect(result.current.renaming).toBe(false);
    expect(onRename).not.toHaveBeenCalled();
  });

  test("handleKeyDown cancels on Escape", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d1"));
    act(() => {
      result.current.startRenaming();
    });
    act(() => {
      result.current.handleKeyDown({ key: "Escape" } as React.KeyboardEvent);
    });
    expect(result.current.renaming).toBe(false);
  });

  test("handleKeyDown ignores non-Escape keys", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d1"));
    act(() => {
      result.current.startRenaming();
    });
    act(() => {
      result.current.handleKeyDown({ key: "Enter" } as React.KeyboardEvent);
    });
    expect(result.current.renaming).toBe(true);
  });

  test("handleSubmit prevents default and commits", () => {
    const onRename = vi.fn();
    const { result } = renderHook(() => useInlineRename("Original", onRename, "d1"));
    act(() => {
      result.current.startRenaming();
    });
    act(() => {
      result.current.setRenameValue("Final");
    });
    const preventDefault = vi.fn();
    act(() => {
      result.current.handleSubmit({ preventDefault } as unknown as React.FormEvent);
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(onRename).toHaveBeenCalledWith("d1", "Final");
    expect(result.current.renaming).toBe(false);
  });
});

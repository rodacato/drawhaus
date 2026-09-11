import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createMockSocket, triggerSocketEvent, type MockSocket } from "./_helpers/mock-socket";

let nextSocket: MockSocket;

vi.mock("../lib/services/socket", () => ({
  createSocket: () => nextSocket,
}));

vi.mock("@excalidraw/excalidraw", () => ({
  restoreElements: (els: unknown[]) => els,
  exportToBlob: vi.fn(async () => new Blob([""], { type: "image/png" })),
}));

vi.mock("../api/diagrams", () => ({
  diagramsApi: {
    update: vi.fn(async () => ({})),
    updateThumbnail: vi.fn(async () => ({})),
  },
}));

import { useCollaboration } from "../lib/hooks/useCollaboration";
import { diagramsApi } from "../api/diagrams";

const EDIT_EVENTS = ["scene-delta", "scene-update", "save-scene"];

const canvasPrefs = {
  gridModeEnabled: false,
  gridSize: 10,
  viewBackgroundColor: "#fff",
  objectsSnapModeEnabled: false,
};

function renderBoard() {
  const hook = renderHook(() =>
    useCollaboration({
      diagramId: "diag-1",
      joinMode: { type: "authenticated", roomId: "diag-1" },
      initialElements: [],
      initialAppState: {},
      canvasPrefs,
    }),
  );
  act(() => {
    triggerSocketEvent(nextSocket, "connect");
  });
  return hook;
}

function joinAs(role: string) {
  act(() => {
    triggerSocketEvent(nextSocket, "room-joined", { roomId: "diag-1", role, userId: "me" });
  });
}

function sentEdits() {
  return nextSocket.emit.mock.calls.filter(([event]) => EDIT_EVENTS.includes(event as string));
}

describe("useCollaboration roles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    nextSocket = createMockSocket({ id: "sock-1" });
    vi.mocked(diagramsApi.update).mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("the board stays read-only until the room join names a role", () => {
    const { result } = renderBoard();

    expect(result.current.canEdit).toBe(false);
    expect(result.current.viewModeEnabled).toBe(true);
  });

  test.each(["owner", "editor"])("an %s gets an editable canvas once joined", (role) => {
    const { result } = renderBoard();

    joinAs(role);

    expect(result.current.canEdit).toBe(true);
    expect(result.current.viewModeEnabled).toBe(false);
  });

  test("a viewer stays in view mode and sends no edits, not even on an explicit save", async () => {
    const { result } = renderBoard();
    joinAs("viewer");

    act(() => {
      result.current.onChange([{ id: "e1", version: 2 }], { scrollX: 0, scrollY: 0 });
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await result.current.flushSave();
    });

    expect(result.current.viewModeEnabled).toBe(true);
    expect(sentEdits()).toEqual([]);
    expect(diagramsApi.update).not.toHaveBeenCalled();
  });

  test("an editor following someone is put in view mode, and back to editing after", () => {
    const { result } = renderBoard();
    joinAs("editor");
    act(() => {
      triggerSocketEvent(nextSocket, "room-presence", {
        users: [{ userId: "leader", name: "Leader" }],
      });
    });

    act(() => result.current.setFollowingUserId("leader"));
    expect(result.current.viewModeEnabled).toBe(true);

    act(() => result.current.setFollowingUserId(null));
    expect(result.current.viewModeEnabled).toBe(false);
  });
});

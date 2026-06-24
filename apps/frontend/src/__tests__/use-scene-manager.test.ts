import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  createMockSocket,
  createExcalidrawApiStub,
  makeRef,
  triggerSocketEvent,
  type MockSocket,
} from "./_helpers/mock-socket";
import type { Socket } from "socket.io-client";

vi.mock("@excalidraw/excalidraw", () => ({
  restoreElements: (els: unknown[]) =>
    (els as { id: string }[]).map((e) => ({ ...e, _restored: true })),
}));

import { useSceneManager } from "../lib/hooks/collaboration/useSceneManager";

function renderScene(opts: {
  socket: MockSocket;
  api?: ReturnType<typeof createExcalidrawApiStub> | null;
  onConflict?: ReturnType<typeof vi.fn>;
  onRemoteDelete?: ReturnType<typeof vi.fn>;
  pendingSceneRef?: { current: { elements: unknown[] } | null };
}) {
  const socketRef = makeRef(opts.socket as unknown as Socket | null);
  const apiRef = makeRef(opts.api === null ? null : (opts.api ?? createExcalidrawApiStub()));
  const applyingRemoteCounter = makeRef(0);
  const activeSceneIdRef = makeRef<string | null>(null);
  const pendingSceneRef = opts.pendingSceneRef ?? makeRef<{ elements: unknown[] } | null>(null);

  return {
    apiRef,
    applyingRemoteCounter,
    activeSceneIdRef,
    pendingSceneRef,
    ...renderHook(() =>
      useSceneManager({
        socketRef,
        socketGeneration: 1,
        excalidrawApiRef: apiRef as never,
        applyingRemoteCounter,
        activeSceneIdRef,
        pendingSceneRef,
        onConflict: opts.onConflict,
        onRemoteDelete: opts.onRemoteDelete,
      }),
    ),
  };
}

describe("useSceneManager", () => {
  let socket: MockSocket;

  beforeEach(() => {
    socket = createMockSocket({ id: "self" });
  });

  test("subscribes to scene-from-db, scene-updated, scene-delta-received", () => {
    renderScene({ socket });
    expect(socket.handlers.has("scene-from-db")).toBe(true);
    expect(socket.handlers.has("scene-updated")).toBe(true);
    expect(socket.handlers.has("scene-delta-received")).toBe(true);
  });

  test("scene-from-db updates activeSceneId and applies normalised elements", async () => {
    const api = createExcalidrawApiStub();
    const { result, apiRef, activeSceneIdRef } = renderScene({ socket, api });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        activeSceneId: "scene-x",
        elements: [{ id: "e1", version: 1 }],
      });
    });

    await waitFor(() => expect(result.current.activeSceneId).toBe("scene-x"));
    expect(activeSceneIdRef.current).toBe("scene-x");
    await waitFor(() => expect(apiRef.current!.updateScene).toHaveBeenCalled());
    const arg = (apiRef.current!.updateScene as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as { elements: { _restored?: boolean }[] };
    expect(arg.elements[0]._restored).toBe(true);
  });

  test("scene-from-db falls back to pendingSceneRef when api is not yet ready", async () => {
    const pendingSceneRef = makeRef<{ elements: unknown[] } | null>(null);
    renderScene({ socket, api: null, pendingSceneRef });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", { elements: [{ id: "p1", version: 1 }] });
    });

    await waitFor(() => expect(pendingSceneRef.current).not.toBeNull());
    expect(pendingSceneRef.current!.elements).toHaveLength(1);
  });

  test("scene-updated ignores events that originate from the current socket", () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    const { apiRef } = renderScene({ socket, api });
    act(() => {
      triggerSocketEvent(socket, "scene-updated", { fromSocketId: socket.id, elements: [{ id: "x", version: 2 }] });
    });
    expect(apiRef.current!.updateScene).not.toHaveBeenCalled();
  });

  test("scene-updated from a different socket merges remote into local", () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1, text: "local" }] });
    const { apiRef, applyingRemoteCounter } = renderScene({ socket, api });

    act(() => {
      triggerSocketEvent(socket, "scene-updated", {
        fromSocketId: "other-sock",
        elements: [{ id: "a", version: 2, text: "remote" }],
      });
    });

    expect(apiRef.current!.updateScene).toHaveBeenCalled();
    expect(applyingRemoteCounter.current).toBeGreaterThanOrEqual(0);
  });

  test("scene-delta-received fires onConflict when remote version overwrites local edit", () => {
    const onConflict = vi.fn();
    const onRemoteDelete = vi.fn();
    // Conflict requires: remote.version > local.version > 0
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    renderScene({ socket, api, onConflict, onRemoteDelete });

    act(() => {
      triggerSocketEvent(socket, "scene-delta-received", {
        fromSocketId: "other",
        fromUserId: "user-other",
        changed: [{ id: "a", version: 5 }],
        removedIds: [],
      });
    });

    expect(onConflict).toHaveBeenCalled();
    expect(onConflict.mock.calls[0][0]).toContain("a");
    expect(onConflict.mock.calls[0][1]).toBe("user-other");
  });

  test("scene-delta-received fires onRemoteDelete with deleted IDs", () => {
    const onRemoteDelete = vi.fn();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }, { id: "b", version: 1 }] });
    renderScene({ socket, api, onRemoteDelete });

    act(() => {
      triggerSocketEvent(socket, "scene-delta-received", {
        fromSocketId: "other",
        fromUserId: "user-other",
        changed: [],
        removedIds: ["b"],
      });
    });

    expect(onRemoteDelete).toHaveBeenCalled();
    expect(onRemoteDelete.mock.calls[0][0]).toContain("b");
  });

  test("scene-delta-received ignores delta from self", () => {
    const onConflict = vi.fn();
    const api = createExcalidrawApiStub({ elements: [] });
    const { apiRef } = renderScene({ socket, api, onConflict });

    act(() => {
      triggerSocketEvent(socket, "scene-delta-received", {
        fromSocketId: socket.id,
        fromUserId: "me",
        changed: [{ id: "a", version: 1 }],
        removedIds: [],
      });
    });

    expect(apiRef.current!.updateScene).not.toHaveBeenCalled();
    expect(onConflict).not.toHaveBeenCalled();
  });

  test("unmount removes the three scene-* listeners", () => {
    const { unmount } = renderScene({ socket });
    unmount();
    expect(socket.handlers.get("scene-from-db")?.size ?? 0).toBe(0);
    expect(socket.handlers.get("scene-updated")?.size ?? 0).toBe(0);
    expect(socket.handlers.get("scene-delta-received")?.size ?? 0).toBe(0);
  });

  test("returns null activeSceneId before any scene-from-db event", () => {
    const { result } = renderScene({ socket });
    expect(result.current.activeSceneId).toBeNull();
  });
});

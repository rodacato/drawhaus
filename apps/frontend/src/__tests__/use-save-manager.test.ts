import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  createMockSocket,
  createExcalidrawApiStub,
  makeRef,
  triggerSocketEvent,
  type MockSocket,
} from "./_helpers/mock-socket";
import type { Socket } from "socket.io-client";

// Stub the heavy Excalidraw import (only exportToBlob is reached, and only via thumbnail path).
vi.mock("@excalidraw/excalidraw", () => ({
  exportToBlob: vi.fn(async () => new Blob([""], { type: "image/png" })),
}));

// Stub the diagrams API surface useSaveManager hits (update + updateThumbnail).
vi.mock("../api/diagrams", () => ({
  diagramsApi: {
    update: vi.fn(async () => ({})),
    updateThumbnail: vi.fn(async () => ({})),
  },
}));

import { useSaveManager } from "../lib/hooks/collaboration/useSaveManager";
import { diagramsApi } from "../api/diagrams";

type RenderOpts = {
  socket: MockSocket;
  api?: ReturnType<typeof createExcalidrawApiStub>;
  canEdit?: boolean;
  diagramId?: string;
  activeSceneId?: string | null;
  socketConnected?: boolean;
};

function renderSaveManager(opts: RenderOpts) {
  const socket = opts.socket;
  if (opts.socketConnected !== undefined) socket.connected = opts.socketConnected;
  const socketRef = makeRef(socket as unknown as Socket | null);
  const api = opts.api ?? createExcalidrawApiStub();
  const excalidrawApiRef = makeRef(api);
  const applyingRemoteCounter = makeRef(0);
  const activeSceneIdRef = makeRef<string | null>(opts.activeSceneId ?? "scene-1");
  const followingUserIdRef = makeRef<string | null>(null);
  const followedViewportRef = makeRef<{ scrollX: number; scrollY: number; zoom: number } | null>(null);

  return {
    api,
    applyingRemoteCounter,
    activeSceneIdRef,
    followingUserIdRef,
    followedViewportRef,
    ...renderHook(() =>
      useSaveManager({
        socketRef,
        socketGeneration: 1,
        diagramId: opts.diagramId ?? "diag-1",
        activeSceneIdRef,
        excalidrawApiRef: excalidrawApiRef as never,
        applyingRemoteCounter,
        followingUserIdRef,
        followedViewportRef,
        canEdit: opts.canEdit ?? true,
      }),
    ),
  };
}

const appStateBase = { scrollX: 0, scrollY: 0, zoom: { value: 1 } };

describe("useSaveManager", () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(diagramsApi.update).mockClear();
    vi.mocked(diagramsApi.updateThumbnail).mockClear();
    socket = createMockSocket({ id: "self" });
    socket.connected = true;
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("initial state is 'idle' with derived label 'Ready'", () => {
    const { result } = renderSaveManager({ socket });
    expect(result.current.saveState).toBe("idle");
    expect(result.current.saveLabel).toBe("Ready");
    expect(result.current.lastSavedAt).toBeNull();
  });

  test("onChange sets saveState='pending' immediately when canEdit", () => {
    const { result } = renderSaveManager({ socket });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    expect(result.current.saveState).toBe("pending");
  });

  test("onChange does NOT set pending when canEdit=false", () => {
    const { result } = renderSaveManager({ socket, canEdit: false });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    expect(result.current.saveState).toBe("idle");
  });

  test("onChange emits viewport-update on the throttled window", () => {
    const { result } = renderSaveManager({ socket });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], { ...appStateBase, scrollX: 30 }); });
    const viewportEmits = socket.emit.mock.calls.filter((c) => c[0] === "viewport-update");
    expect(viewportEmits.length).toBe(1);
    expect(viewportEmits[0][1]).toMatchObject({ roomId: "diag-1", scrollX: 30, scrollY: 0, zoom: 1 });
  });

  test("first onChange emits scene-delta with the new elements", () => {
    const { result } = renderSaveManager({ socket });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }, { id: "e2", version: 1 }], appStateBase);
    });
    const deltas = socket.emit.mock.calls.filter((c) => c[0] === "scene-delta");
    expect(deltas.length).toBe(1);
    expect(deltas[0][1]).toMatchObject({ roomId: "diag-1", sceneId: "scene-1" });
  });

  test("rapid onChange invocations are throttled (no double-emit within one window)", () => {
    const { result } = renderSaveManager({ socket });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    act(() => { result.current.onChange([{ id: "e1", version: 2 }], appStateBase); });
    const deltas = socket.emit.mock.calls.filter((c) => c[0] === "scene-delta");
    // Second call is queued behind the throttle timer; only the first delta has been emitted.
    expect(deltas.length).toBe(1);
  });

  test("debounce: after SAVE_DEBOUNCE_MS the scene is persisted (emits save-scene when connected)", async () => {
    const { result } = renderSaveManager({ socket, socketConnected: true });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    socket.emit.mockClear();
    await act(async () => { vi.advanceTimersByTime(1300); });
    const saves = socket.emit.mock.calls.filter((c) => c[0] === "save-scene");
    expect(saves.length).toBe(1);
    expect(saves[0][1]).toMatchObject({ roomId: "diag-1", sceneId: "scene-1" });
  });

  test("when socket is disconnected the debounced save falls back to diagramsApi.update", async () => {
    const { result } = renderSaveManager({ socket, socketConnected: false });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    // Let the awaited promise inside persistScene resolve before asserting.
    await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(diagramsApi.update)).toHaveBeenCalledWith("diag-1", expect.objectContaining({ elements: expect.any(Array) }));
  });

  test("REST fallback path transitions saveState to 'saved' on success", async () => {
    vi.mocked(diagramsApi.update).mockResolvedValueOnce({} as never);
    const { result } = renderSaveManager({ socket, socketConnected: false });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    // Flush microtasks queued by the awaited diagramsApi.update + thumbnail import chain.
    for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });
    expect(result.current.saveState).toBe("saved");
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  test("REST fallback path sets saveState='error' when diagramsApi.update rejects", async () => {
    vi.mocked(diagramsApi.update).mockRejectedValueOnce(new Error("network"));
    const { result } = renderSaveManager({ socket, socketConnected: false });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });
    expect(result.current.saveState).toBe("error");
  });

  test("scene-saved socket event transitions to 'saved' and updates lastSavedAt", () => {
    const { result } = renderSaveManager({ socket });
    act(() => { triggerSocketEvent(socket, "scene-saved", {}); });
    expect(result.current.saveState).toBe("saved");
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  test("scene-saved derives label as 'Saved <time>'", () => {
    const { result } = renderSaveManager({ socket });
    act(() => { triggerSocketEvent(socket, "scene-saved", {}); });
    expect(result.current.saveLabel.startsWith("Saved ")).toBe(true);
  });

  test("when applyingRemoteCounter > 0, onChange is a no-op (no emits, no pending)", () => {
    const { result, applyingRemoteCounter } = renderSaveManager({ socket });
    applyingRemoteCounter.current = 1;
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    expect(socket.emit).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe("idle");
  });

  test("when following another user, onChange skips the edit path entirely", () => {
    const { result, followingUserIdRef, followedViewportRef, api } = renderSaveManager({ socket });
    followingUserIdRef.current = "u-target";
    followedViewportRef.current = { scrollX: 100, scrollY: 100, zoom: 1 };
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], { scrollX: 0, scrollY: 0, zoom: { value: 1 } }); });
    // No scene-delta should be emitted — we're following someone.
    const deltas = socket.emit.mock.calls.filter((c) => c[0] === "scene-delta");
    expect(deltas.length).toBe(0);
    // The hook will snap the viewport back to the followed user's viewport.
    expect(api.updateScene).toHaveBeenCalled();
  });

  test("flushSave forces a persist using the current scene state", async () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "x", version: 1 }] });
    const { result } = renderSaveManager({ socket, api, socketConnected: false });
    await act(async () => { await result.current.flushSave(); });
    expect(vi.mocked(diagramsApi.update)).toHaveBeenCalledWith("diag-1", expect.objectContaining({ elements: expect.any(Array) }));
  });

  test("flushSave is a no-op when the excalidraw api is not ready", async () => {
    const socketRef = makeRef(socket as unknown as Socket | null);
    const excalidrawApiRef = makeRef(null);
    const { result } = renderHook(() =>
      useSaveManager({
        socketRef,
        socketGeneration: 1,
        diagramId: "diag-1",
        activeSceneIdRef: makeRef<string | null>("scene-1"),
        excalidrawApiRef: excalidrawApiRef as never,
        applyingRemoteCounter: makeRef(0),
        followingUserIdRef: makeRef<string | null>(null),
        followedViewportRef: makeRef<{ scrollX: number; scrollY: number; zoom: number } | null>(null),
        canEdit: true,
      }),
    );
    await act(async () => { await result.current.flushSave(); });
    expect(vi.mocked(diagramsApi.update)).not.toHaveBeenCalled();
  });

  test("cancelPendingTimers prevents the debounced save from firing", async () => {
    const { result } = renderSaveManager({ socket, socketConnected: true });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    socket.emit.mockClear();
    act(() => { result.current.cancelPendingTimers(); });
    await act(async () => { vi.advanceTimersByTime(2000); });
    const saves = socket.emit.mock.calls.filter((c) => c[0] === "save-scene");
    expect(saves.length).toBe(0);
  });

  test("persistScene aborts when the captured scene id no longer matches the active scene", async () => {
    const { result, activeSceneIdRef } = renderSaveManager({ socket, socketConnected: false });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    // Active scene changes BEFORE debounce fires — persist should bail out.
    activeSceneIdRef.current = "scene-different";
    await act(async () => { vi.advanceTimersByTime(1300); });
    await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(diagramsApi.update)).not.toHaveBeenCalled();
  });

  test("falls back to full scene-update when delta removes more than 50% of elements", () => {
    const { result } = renderSaveManager({ socket });
    // Seed previous elements via a first onChange (4 elements).
    act(() => {
      result.current.onChange(
        [
          { id: "a", version: 1 },
          { id: "b", version: 1 },
          { id: "c", version: 1 },
          { id: "d", version: 1 },
        ],
        appStateBase,
      );
    });
    socket.emit.mockClear();
    // Wait past the throttle window so the next onChange emits immediately.
    act(() => { vi.advanceTimersByTime(200); });
    // Remove 3 of 4 => >50%, should emit scene-update (full) not scene-delta.
    act(() => { result.current.onChange([{ id: "a", version: 1 }], appStateBase); });
    const fullUpdates = socket.emit.mock.calls.filter((c) => c[0] === "scene-update");
    const deltas = socket.emit.mock.calls.filter((c) => c[0] === "scene-delta");
    expect(fullUpdates.length).toBe(1);
    expect(deltas.length).toBe(0);
  });

  test("cache-key is written to localStorage on persist", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderSaveManager({ socket, socketConnected: false, diagramId: "diag-99" });
    act(() => { result.current.onChange([{ id: "e1", version: 1 }], appStateBase); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    await act(async () => { await Promise.resolve(); });
    const calls = setItem.mock.calls.filter((c) => c[0] === "drawhaus_scene_diag-99");
    expect(calls.length).toBeGreaterThanOrEqual(1);
    setItem.mockRestore();
  });
});

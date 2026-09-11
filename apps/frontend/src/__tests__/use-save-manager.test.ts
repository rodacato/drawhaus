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
import { SceneSync } from "../lib/scene-sync";
import { diagramsApi } from "../api/diagrams";

type RenderOpts = {
  socket: MockSocket;
  api?: ReturnType<typeof createExcalidrawApiStub>;
  canEdit?: boolean;
  diagramId?: string;
  activeSceneId?: string | null;
  socketConnected?: boolean;
  /** The scene the server sent on join; null for a board still waiting for it. */
  serverScene?: unknown[] | null;
};

function renderSaveManager(opts: RenderOpts) {
  const socket = opts.socket;
  if (opts.socketConnected !== undefined) socket.connected = opts.socketConnected;
  const socketRef = makeRef(socket as unknown as Socket | null);
  const api = opts.api ?? createExcalidrawApiStub();
  const excalidrawApiRef = makeRef(api);
  const sync = new SceneSync();
  if (opts.serverScene !== null) sync.reset(opts.serverScene ?? []);
  const activeSceneIdRef = makeRef<string | null>(opts.activeSceneId ?? "scene-1");
  const followingUserIdRef = makeRef<string | null>(null);
  const followedViewportRef = makeRef<{ scrollX: number; scrollY: number; zoom: number } | null>(
    null,
  );

  return {
    api,
    sync,
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
        sync,
        followingUserIdRef,
        followedViewportRef,
        canEdit: opts.canEdit ?? true,
      }),
    ),
  };
}

const appStateBase = { scrollX: 0, scrollY: 0, zoom: { value: 1 } };

function emitted(socket: MockSocket, event: string) {
  return socket.emit.mock.calls.filter((c) => c[0] === event).map((c) => c[1]);
}

function sentVersions(socket: MockSocket) {
  return emitted(socket, "scene-delta").flatMap((d) =>
    (d as { changed: { version: number }[] }).changed.map((e) => e.version),
  );
}

describe("useSaveManager", () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(diagramsApi.update).mockClear();
    vi.mocked(diagramsApi.updateThumbnail).mockClear();
    socket = createMockSocket({ id: "self" });
    socket.connected = true;
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
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
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    expect(result.current.saveState).toBe("pending");
  });

  test("onChange does NOT set pending when canEdit=false", () => {
    const { result } = renderSaveManager({ socket, canEdit: false });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    expect(result.current.saveState).toBe("idle");
  });

  test("onChange emits viewport-update on the throttled window", () => {
    const { result } = renderSaveManager({ socket });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], { ...appStateBase, scrollX: 30 });
    });
    const viewportEmits = emitted(socket, "viewport-update");
    expect(viewportEmits.length).toBe(1);
    expect(viewportEmits[0]).toMatchObject({
      roomId: "diag-1",
      scrollX: 30,
      scrollY: 0,
      zoom: 1,
    });
  });

  test("first onChange emits scene-delta with the new elements", () => {
    const { result } = renderSaveManager({ socket });
    act(() => {
      result.current.onChange(
        [
          { id: "e1", version: 1 },
          { id: "e2", version: 1 },
        ],
        appStateBase,
      );
    });
    const deltas = emitted(socket, "scene-delta");
    expect(deltas.length).toBe(1);
    expect(deltas[0]).toMatchObject({ roomId: "diag-1", sceneId: "scene-1" });
  });

  test("rapid onChange invocations are throttled (no double-emit within one window)", () => {
    const { result } = renderSaveManager({ socket });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    act(() => {
      result.current.onChange([{ id: "e1", version: 2 }], appStateBase);
    });
    // Second call is queued behind the throttle timer; only the first delta has been emitted.
    expect(emitted(socket, "scene-delta").length).toBe(1);
  });

  test("a drag's final version is broadcast although Excalidraw mutates the element in place", () => {
    const { result } = renderSaveManager({ socket });
    const rect = { id: "rect", version: 1 };
    const scene = [rect];

    act(() => result.current.onChange(scene, appStateBase));
    rect.version = 4;
    act(() => result.current.onChange(scene, appStateBase));
    rect.version = 9;
    act(() => result.current.onChange(scene, appStateBase));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(sentVersions(socket)).toEqual([1, 9]);
  });

  test("a scene that only arrived from the room is neither echoed nor saved", async () => {
    const received = [{ id: "r1", version: 3 }];
    const { result } = renderSaveManager({ socket, serverScene: received });

    act(() => {
      result.current.onChange(received, appStateBase);
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });

    expect(emitted(socket, "scene-delta")).toEqual([]);
    expect(emitted(socket, "save-scene")).toEqual([]);
    expect(result.current.saveState).toBe("idle");
  });

  test("nothing is sent before the server's scene sets the baseline", async () => {
    const { result } = renderSaveManager({ socket, serverScene: null });

    act(() => {
      result.current.onChange([{ id: "cached", version: 1 }], appStateBase);
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });

    expect(emitted(socket, "scene-delta")).toEqual([]);
    expect(emitted(socket, "save-scene")).toEqual([]);
  });

  test("debounce: after SAVE_DEBOUNCE_MS the scene is persisted (emits save-scene when connected)", async () => {
    const { result } = renderSaveManager({ socket, socketConnected: true });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    socket.emit.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    const saves = emitted(socket, "save-scene");
    expect(saves.length).toBe(1);
    expect(saves[0]).toMatchObject({ roomId: "diag-1", sceneId: "scene-1" });
  });

  test("when socket is disconnected the debounced save falls back to diagramsApi.update", async () => {
    const { result } = renderSaveManager({ socket, socketConnected: false });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    // Let the awaited promise inside persistScene resolve before asserting.
    await act(async () => {
      await Promise.resolve();
    });
    expect(vi.mocked(diagramsApi.update)).toHaveBeenCalledWith(
      "diag-1",
      expect.objectContaining({ elements: expect.any(Array) }),
    );
  });

  test("REST fallback path transitions saveState to 'saved' on success", async () => {
    vi.mocked(diagramsApi.update).mockResolvedValueOnce({} as never);
    const { result } = renderSaveManager({ socket, socketConnected: false });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    // Flush microtasks queued by the awaited diagramsApi.update + thumbnail import chain.
    for (let i = 0; i < 5; i++)
      await act(async () => {
        await Promise.resolve();
      });
    expect(result.current.saveState).toBe("saved");
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  test("REST fallback path sets saveState='error' when diagramsApi.update rejects", async () => {
    vi.mocked(diagramsApi.update).mockRejectedValueOnce(new Error("network"));
    const { result } = renderSaveManager({ socket, socketConnected: false });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    for (let i = 0; i < 5; i++)
      await act(async () => {
        await Promise.resolve();
      });
    expect(result.current.saveState).toBe("error");
  });

  test("scene-saved socket event transitions to 'saved' and updates lastSavedAt", () => {
    const { result } = renderSaveManager({ socket });
    act(() => {
      triggerSocketEvent(socket, "scene-saved", {});
    });
    expect(result.current.saveState).toBe("saved");
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  test("scene-saved derives label as 'Saved <time>'", () => {
    const { result } = renderSaveManager({ socket });
    act(() => {
      triggerSocketEvent(socket, "scene-saved", {});
    });
    expect(result.current.saveLabel.startsWith("Saved ")).toBe(true);
  });

  test("when following another user, onChange skips the edit path entirely", () => {
    const { result, followingUserIdRef, followedViewportRef, api } = renderSaveManager({ socket });
    followingUserIdRef.current = "u-target";
    followedViewportRef.current = { scrollX: 100, scrollY: 100, zoom: 1 };
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], {
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
      });
    });
    // No scene-delta should be emitted — we're following someone.
    expect(emitted(socket, "scene-delta").length).toBe(0);
    // The hook snaps the viewport back to the followed user's, outside the undo stack.
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: { scrollX: 100, scrollY: 100, zoom: { value: 1 } },
        captureUpdate: "NEVER",
      }),
    );
  });

  test("flushSave forces a persist using the current scene state and returns true on success", async () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "x", version: 1 }] });
    const { result } = renderSaveManager({ socket, api, socketConnected: false });
    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.flushSave();
    });
    expect(vi.mocked(diagramsApi.update)).toHaveBeenCalledWith(
      "diag-1",
      expect.objectContaining({ elements: expect.any(Array) }),
    );
    expect(returned).toBe(true);
  });

  test("flushSave persists deleted elements, so the delete survives on the server", async () => {
    const api = createExcalidrawApiStub({
      elements: [
        { id: "kept", version: 1 },
        { id: "gone", version: 2, isDeleted: true },
      ],
    });
    const { result } = renderSaveManager({ socket, api });

    await act(async () => {
      await result.current.flushSave();
    });

    const [save] = emitted(socket, "save-scene") as { elements: { id: string }[] }[];
    expect(save.elements.map((e) => e.id)).toEqual(["kept", "gone"]);
  });

  test("flushSave returns false when the REST persist fails so callers can react", async () => {
    vi.mocked(diagramsApi.update).mockRejectedValueOnce(new Error("boom"));
    const api = createExcalidrawApiStub({ elements: [{ id: "x", version: 1 }] });
    const { result } = renderSaveManager({ socket, api, socketConnected: false });
    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.flushSave();
    });
    expect(returned).toBe(false);
    expect(result.current.saveState).toBe("error");
  });

  test("flushSave returns true when the socket emit path is taken (best-effort)", async () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "x", version: 1 }] });
    const { result } = renderSaveManager({ socket, api, socketConnected: true });
    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.flushSave();
    });
    expect(emitted(socket, "save-scene").length).toBe(1);
    expect(returned).toBe(true);
  });

  test("flushSave is a no-op when the excalidraw api is not ready", async () => {
    const socketRef = makeRef(socket as unknown as Socket | null);
    const excalidrawApiRef = makeRef(null);
    const sync = new SceneSync();
    sync.reset([]);
    const { result } = renderHook(() =>
      useSaveManager({
        socketRef,
        socketGeneration: 1,
        diagramId: "diag-1",
        activeSceneIdRef: makeRef<string | null>("scene-1"),
        excalidrawApiRef: excalidrawApiRef as never,
        sync,
        followingUserIdRef: makeRef<string | null>(null),
        followedViewportRef: makeRef<{ scrollX: number; scrollY: number; zoom: number } | null>(
          null,
        ),
        canEdit: true,
      }),
    );
    await act(async () => {
      await result.current.flushSave();
    });
    expect(vi.mocked(diagramsApi.update)).not.toHaveBeenCalled();
  });

  test("cancelPendingTimers prevents the debounced save from firing", async () => {
    const { result } = renderSaveManager({ socket, socketConnected: true });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    socket.emit.mockClear();
    act(() => {
      result.current.cancelPendingTimers();
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(emitted(socket, "save-scene").length).toBe(0);
  });

  test("persistScene aborts when the captured scene id no longer matches the active scene", async () => {
    const { result, activeSceneIdRef } = renderSaveManager({ socket, socketConnected: false });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    // Active scene changes BEFORE debounce fires — persist should bail out.
    activeSceneIdRef.current = "scene-different";
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    await act(async () => {
      await Promise.resolve();
    });
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
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Remove 3 of 4 => >50%, should emit scene-update (full) not scene-delta.
    act(() => {
      result.current.onChange([{ id: "a", version: 1 }], appStateBase);
    });
    expect(emitted(socket, "scene-update").length).toBe(1);
    expect(emitted(socket, "scene-delta").length).toBe(0);
  });

  test("cache-key is written to localStorage on persist", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderSaveManager({ socket, socketConnected: false, diagramId: "diag-99" });
    act(() => {
      result.current.onChange([{ id: "e1", version: 1 }], appStateBase);
    });
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const calls = setItem.mock.calls.filter((c) => c[0] === "drawhaus_scene_diag-99");
    expect(calls.length).toBeGreaterThanOrEqual(1);
    setItem.mockRestore();
  });
});

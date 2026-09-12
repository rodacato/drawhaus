import { describe, test, expect, beforeEach, vi, type Mock } from "vitest";
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

import {
  useSceneManager,
  type UseSceneManagerParams,
} from "../lib/hooks/collaboration/useSceneManager";
import { SceneSync } from "../lib/scene-sync";

type OnConflict = NonNullable<UseSceneManagerParams["onConflict"]>;
type OnRemoteDelete = NonNullable<UseSceneManagerParams["onRemoteDelete"]>;
type OnEditsReplaced = NonNullable<UseSceneManagerParams["onEditsReplaced"]>;

function renderScene(opts: {
  socket: MockSocket;
  api?: ReturnType<typeof createExcalidrawApiStub> | null;
  /** What the room already had; defaults to the stub's scene, i.e. no local edits. */
  shared?: unknown[];
  /** The scene revision that baseline came with. */
  revision?: number | null;
  onConflict?: Mock<OnConflict>;
  onRemoteDelete?: Mock<OnRemoteDelete>;
  onEditsReplaced?: Mock<OnEditsReplaced>;
  pendingSceneRef?: { current: { elements: unknown[] } | null };
}) {
  const socketRef = makeRef(opts.socket as unknown as Socket | null);
  const api = opts.api === null ? null : (opts.api ?? createExcalidrawApiStub());
  const apiRef = makeRef(api);
  const sync = new SceneSync();
  sync.reset(opts.shared ?? api?._state.elements ?? [], opts.revision ?? null);
  const activeSceneIdRef = makeRef<string | null>(null);
  const pendingSceneRef = opts.pendingSceneRef ?? makeRef<{ elements: unknown[] } | null>(null);

  return {
    apiRef,
    sync,
    activeSceneIdRef,
    pendingSceneRef,
    ...renderHook(() =>
      useSceneManager({
        socketRef,
        socketGeneration: 1,
        excalidrawApiRef: apiRef as never,
        sync,
        activeSceneIdRef,
        pendingSceneRef,
        onConflict: opts.onConflict,
        onRemoteDelete: opts.onRemoteDelete,
        onEditsReplaced: opts.onEditsReplaced,
      }),
    ),
  };
}

function receiveDelta(
  socket: MockSocket,
  changed: unknown[],
  removedIds: string[] = [],
  revision?: number,
) {
  act(() => {
    triggerSocketEvent(socket, "scene-delta-received", {
      fromSocketId: "other",
      fromUserId: "user-other",
      changed,
      removedIds,
      revision,
    });
  });
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
    const arg = (apiRef.current!.updateScene as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0][0] as { elements: { _restored?: boolean }[] };
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

  test("the server's scene becomes the baseline, so it is never sent back as an edit", async () => {
    const api = createExcalidrawApiStub();
    const { sync } = renderScene({ socket, api });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", { elements: [{ id: "e1", version: 3 }] });
    });

    await waitFor(() => expect(api.updateScene).toHaveBeenCalled());
    expect(sync.hasChanges(api.getSceneElementsIncludingDeleted())).toBe(false);
  });

  test("after a reconnect, edits the server has not seen stay on the canvas and pending", async () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 3 }] });
    const { sync } = renderScene({
      socket,
      api,
      shared: [{ id: "a", version: 1 }],
      revision: 1,
    });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        elements: [
          { id: "a", version: 1 },
          { id: "b", version: 1 },
        ],
        revision: 1,
      });
    });

    await waitFor(() => expect(api.updateScene).toHaveBeenCalled());
    const scene = api.getSceneElementsIncludingDeleted() as { id: string; version: number }[];
    expect(scene.map((e) => `${e.id}@${e.version}`)).toEqual(["a@3", "b@1"]);
    expect(sync.editedIds(scene)).toEqual(new Set(["a"]));
  });

  test("a scene from a new revision replaces edits computed before it", async () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 3 }] });
    const { sync } = renderScene({
      socket,
      api,
      shared: [{ id: "a", version: 1 }],
      revision: 1,
    });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        elements: [{ id: "a", version: 1 }],
        revision: 2,
      });
    });

    await waitFor(() => expect(api.updateScene).toHaveBeenCalled());
    const scene = api.getSceneElementsIncludingDeleted() as { id: string; version: number }[];
    expect(scene.map((e) => `${e.id}@${e.version}`)).toEqual(["a@1"]);
    expect(sync.editedIds(scene)).toEqual(new Set());
  });

  test("a replace that throws away unsaved edits says so, and still throws them away", async () => {
    const onEditsReplaced = vi.fn<OnEditsReplaced>();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 3 }] });
    renderScene({ socket, api, shared: [{ id: "a", version: 1 }], revision: 1, onEditsReplaced });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        elements: [{ id: "a", version: 1 }],
        revision: 2,
      });
    });

    await waitFor(() => expect(onEditsReplaced).toHaveBeenCalledWith(["a"]));
    const scene = api.getSceneElementsIncludingDeleted() as { id: string; version: number }[];
    expect(scene.map((e) => `${e.id}@${e.version}`)).toEqual(["a@1"]);
  });

  test("a replace a local delete was waiting on is reported, although no element carries it", async () => {
    const onEditsReplaced = vi.fn<OnEditsReplaced>();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    const { sync } = renderScene({
      socket,
      api,
      shared: [
        { id: "a", version: 1 },
        { id: "b", version: 1 },
      ],
      revision: 1,
      onEditsReplaced,
    });
    sync.takeChanges([{ id: "a", version: 1 }]);

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        elements: [
          { id: "a", version: 1 },
          { id: "b", version: 1 },
        ],
        revision: 2,
      });
    });

    await waitFor(() => expect(onEditsReplaced).toHaveBeenCalledWith(["b"]));
  });

  test("a replace with nothing unsaved is silent", async () => {
    const onEditsReplaced = vi.fn<OnEditsReplaced>();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    renderScene({ socket, api, shared: [{ id: "a", version: 1 }], revision: 1, onEditsReplaced });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        elements: [{ id: "a", version: 7 }],
        revision: 2,
      });
    });

    await waitFor(() => expect(api.updateScene).toHaveBeenCalled());
    expect(onEditsReplaced).not.toHaveBeenCalled();
  });

  test("a reconnect keeps unsaved edits, so it is silent too", async () => {
    const onEditsReplaced = vi.fn<OnEditsReplaced>();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 3 }] });
    renderScene({ socket, api, shared: [{ id: "a", version: 1 }], revision: 1, onEditsReplaced });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", {
        elements: [{ id: "a", version: 1 }],
        revision: 1,
      });
    });

    await waitFor(() => expect(api.updateScene).toHaveBeenCalled());
    expect(onEditsReplaced).not.toHaveBeenCalled();
  });

  test("a delta computed on an older revision is ignored", () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    renderScene({ socket, api, revision: 2 });

    receiveDelta(socket, [{ id: "stale", version: 1 }], [], 1);

    expect(api.updateScene).not.toHaveBeenCalled();
  });

  test("a delta on the current revision is applied", () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    renderScene({ socket, api, revision: 2 });

    receiveDelta(socket, [{ id: "fresh", version: 1 }], [], 2);

    expect(api.getSceneElements()).toEqual([
      { id: "a", version: 1 },
      { id: "fresh", version: 1 },
    ]);
  });

  test("scene-updated ignores events that originate from the current socket", () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    const { apiRef } = renderScene({ socket, api });
    act(() => {
      triggerSocketEvent(socket, "scene-updated", {
        fromSocketId: socket.id,
        elements: [{ id: "x", version: 2 }],
      });
    });
    expect(apiRef.current!.updateScene).not.toHaveBeenCalled();
  });

  test("scene-updated from a different socket merges, and the copies it took count as shared", () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1, text: "local" }] });
    const { sync } = renderScene({ socket, api });

    act(() => {
      triggerSocketEvent(socket, "scene-updated", {
        fromSocketId: "other-sock",
        elements: [{ id: "a", version: 2, text: "remote" }],
      });
    });

    expect(api.getSceneElements()).toEqual([{ id: "a", version: 2, text: "remote" }]);
    expect(sync.hasChanges(api.getSceneElementsIncludingDeleted())).toBe(false);
  });

  test("a conflict is reported only for an element with local edits not yet saved", () => {
    const onConflict = vi.fn<OnConflict>();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 2 }] });
    renderScene({ socket, api, shared: [{ id: "a", version: 1 }], onConflict });

    receiveDelta(socket, [{ id: "a", version: 5 }]);

    expect(onConflict).toHaveBeenCalledWith(["a"], "user-other");
  });

  test("a teammate's change to an element nobody here touched is no conflict", () => {
    const onConflict = vi.fn<OnConflict>();
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    const { sync } = renderScene({ socket, api, onConflict });

    receiveDelta(socket, [{ id: "a", version: 5 }]);

    expect(api.getSceneElements()).toEqual([{ id: "a", version: 5 }]);
    expect(onConflict).not.toHaveBeenCalled();
    expect(sync.hasChanges(api.getSceneElementsIncludingDeleted())).toBe(false);
  });

  test("a remote delete is reported when it removes an element being edited here", () => {
    const onRemoteDelete = vi.fn<OnRemoteDelete>();
    const api = createExcalidrawApiStub({
      elements: [
        { id: "a", version: 1 },
        { id: "b", version: 2 },
      ],
    });
    const shared = [
      { id: "a", version: 1 },
      { id: "b", version: 1 },
    ];
    renderScene({ socket, api, shared, onRemoteDelete });

    receiveDelta(socket, [], ["b"]);

    expect(onRemoteDelete).toHaveBeenCalledWith(["b"], "user-other");
  });

  test("a remote delete of an untouched element is applied without a toast", () => {
    const onRemoteDelete = vi.fn<OnRemoteDelete>();
    const api = createExcalidrawApiStub({
      elements: [
        { id: "a", version: 1 },
        { id: "b", version: 1 },
      ],
    });
    renderScene({ socket, api, onRemoteDelete });

    receiveDelta(socket, [], ["b"]);

    expect(api.getSceneElements()).toEqual([{ id: "a", version: 1 }]);
    expect(onRemoteDelete).not.toHaveBeenCalled();
  });

  test("scene-delta-received ignores delta from self", () => {
    const onConflict = vi.fn<OnConflict>();
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

  test("scenes from the server and from teammates stay out of the local undo stack", async () => {
    const api = createExcalidrawApiStub({ elements: [{ id: "a", version: 1 }] });
    renderScene({ socket, api });

    act(() => {
      triggerSocketEvent(socket, "scene-from-db", { elements: [{ id: "a", version: 1 }] });
    });
    await waitFor(() => expect(api.updateScene).toHaveBeenCalledTimes(1));
    act(() => {
      triggerSocketEvent(socket, "scene-updated", {
        fromSocketId: "other",
        elements: [{ id: "b", version: 1 }],
      });
    });
    receiveDelta(socket, [{ id: "c", version: 1 }]);

    const captures = api.updateScene.mock.calls.map(([scene]) => scene.captureUpdate);
    expect(captures).toEqual(["NEVER", "NEVER", "NEVER"]);
  });

  test("a stale copy of an element deleted here does not bring it back", () => {
    const api = createExcalidrawApiStub({
      elements: [
        { id: "kept", version: 1 },
        { id: "gone", version: 3, isDeleted: true },
      ],
    });
    renderScene({ socket, api });

    receiveDelta(socket, [{ id: "gone", version: 2 }]);
    act(() => {
      triggerSocketEvent(socket, "scene-updated", {
        fromSocketId: "other",
        elements: [
          { id: "kept", version: 1 },
          { id: "gone", version: 2 },
        ],
      });
    });

    expect(api.getSceneElements()).toEqual([{ id: "kept", version: 1 }]);
  });

  test("a newer copy of an element deleted here restores it", () => {
    const api = createExcalidrawApiStub({
      elements: [{ id: "gone", version: 3, isDeleted: true }],
    });
    renderScene({ socket, api });

    receiveDelta(socket, [{ id: "gone", version: 4 }]);

    expect(api.getSceneElements()).toEqual([{ id: "gone", version: 4 }]);
  });
});

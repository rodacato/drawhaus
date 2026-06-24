import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePresence } from "../lib/hooks/collaboration/usePresence";
import {
  createMockSocket,
  createExcalidrawApiStub,
  makeRef,
  triggerSocketEvent,
  type MockSocket,
} from "./_helpers/mock-socket";
import type { Socket } from "socket.io-client";

type RafEntry = { id: number; cb: FrameRequestCallback };
const rafQueue: RafEntry[] = [];
let nextRafId = 1;

function installRafStub() {
  rafQueue.length = 0;
  nextRafId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = nextRafId++;
    rafQueue.push({ id, cb });
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    const idx = rafQueue.findIndex((e) => e.id === id);
    if (idx >= 0) rafQueue.splice(idx, 1);
  });
}

function flushRaf() {
  // Drain all pending rAF callbacks; the hook re-schedules itself so we only
  // drain one batch per call to avoid an infinite loop.
  const pending = rafQueue.splice(0);
  for (const { cb } of pending) cb(0);
}

type RenderOpts = {
  socket: MockSocket;
  api?: ReturnType<typeof createExcalidrawApiStub>;
  selfUserId?: string | null;
  diagramId?: string;
};

function renderPresence(opts: RenderOpts) {
  const socketRef = makeRef(opts.socket as unknown as Socket | null);
  const api = opts.api ?? createExcalidrawApiStub();
  const excalidrawApiRef = makeRef(api);
  const applyingRemoteCounter = makeRef(0);
  const followingUserIdRef = makeRef<string | null>(null);
  const followedViewportRef = makeRef<{ scrollX: number; scrollY: number; zoom: number } | null>(null);

  return {
    api,
    applyingRemoteCounter,
    followingUserIdRef,
    followedViewportRef,
    ...renderHook(() =>
      usePresence({
        socketRef,
        socketGeneration: 1,
        diagramId: opts.diagramId ?? "diag-1",
        excalidrawApiRef: excalidrawApiRef as never,
        applyingRemoteCounter,
        followingUserIdRef,
        followedViewportRef,
        selfUserId: opts.selfUserId ?? "self-user",
      }),
    ),
  };
}

describe("usePresence", () => {
  let socket: MockSocket;

  beforeEach(() => {
    installRafStub();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    socket = createMockSocket({ id: "self-sock" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    rafQueue.length = 0;
  });

  test("starts with empty presence and no cursors", () => {
    const { result } = renderPresence({ socket });
    expect(result.current.presenceUsers).toEqual([]);
    expect(result.current.cursors).toEqual({});
    expect(result.current.followingUserId).toBeNull();
    expect(result.current.raisedHands.size).toBe(0);
    expect(result.current.isHandRaised).toBe(false);
  });

  test("room-presence event populates presenceUsers and marks self", () => {
    const { result } = renderPresence({ socket, selfUserId: "u1" });
    act(() => {
      triggerSocketEvent(socket, "room-presence", {
        users: [
          { userId: "u1", name: "Me" },
          { userId: "u2", name: "Other" },
        ],
      });
    });
    expect(result.current.presenceUsers).toHaveLength(2);
    expect(result.current.presenceUsers.find((u) => u.userId === "u1")?.isSelf).toBe(true);
    expect(result.current.presenceUsers.find((u) => u.userId === "u2")?.isSelf).toBe(false);
  });

  test("cursor-moved adds entry; rAF flush propagates to state", () => {
    const { result } = renderPresence({ socket });
    act(() => {
      triggerSocketEvent(socket, "cursor-moved", { userId: "u2", name: "B", x: 10, y: 20 });
    });
    act(() => { flushRaf(); });
    expect(result.current.cursors["u2"]).toMatchObject({ name: "B", x: 10, y: 20 });
  });

  test("cursor-left removes the cursor entry", () => {
    const { result } = renderPresence({ socket });
    act(() => {
      triggerSocketEvent(socket, "cursor-moved", { userId: "u2", name: "B", x: 1, y: 1 });
    });
    act(() => { flushRaf(); });
    expect(result.current.cursors["u2"]).toBeDefined();
    act(() => {
      triggerSocketEvent(socket, "cursor-left", { userId: "u2" });
    });
    act(() => { flushRaf(); });
    expect(result.current.cursors["u2"]).toBeUndefined();
  });

  test("stale cursors are cleaned up after 5s", () => {
    const { result } = renderPresence({ socket });
    act(() => {
      triggerSocketEvent(socket, "cursor-moved", { userId: "u2", name: "B", x: 0, y: 0 });
    });
    act(() => { flushRaf(); });
    expect(result.current.cursors["u2"]).toBeDefined();
    act(() => { vi.advanceTimersByTime(6000); });
    act(() => { flushRaf(); });
    expect(result.current.cursors["u2"]).toBeUndefined();
  });

  test("onPointerMove throttles cursor-move emissions", () => {
    const { result } = renderPresence({ socket });
    act(() => { result.current.onPointerMove({ clientX: 1, clientY: 1 }); });
    act(() => { result.current.onPointerMove({ clientX: 2, clientY: 2 }); });
    const moves = socket.emit.mock.calls.filter((c) => c[0] === "cursor-move");
    expect(moves.length).toBe(1);
    act(() => { vi.advanceTimersByTime(50); });
    act(() => { result.current.onPointerMove({ clientX: 3, clientY: 3 }); });
    const movesAfter = socket.emit.mock.calls.filter((c) => c[0] === "cursor-move");
    expect(movesAfter.length).toBe(2);
  });

  test("setFollowingUserId updates state and emits request-viewport; clearing it nulls followedViewportRef", () => {
    const { result, followedViewportRef } = renderPresence({ socket });
    // Target must be present in room-presence — otherwise the hook resets following to null.
    act(() => {
      triggerSocketEvent(socket, "room-presence", { users: [{ userId: "u-target", name: "T" }] });
    });
    followedViewportRef.current = { scrollX: 1, scrollY: 2, zoom: 1 };
    act(() => { result.current.setFollowingUserId("u-target"); });
    expect(result.current.followingUserId).toBe("u-target");
    expect(socket.emit).toHaveBeenCalledWith("request-viewport", { roomId: "diag-1", targetUserId: "u-target" });
    act(() => { result.current.setFollowingUserId(null); });
    expect(result.current.followingUserId).toBeNull();
    expect(followedViewportRef.current).toBeNull();
  });

  test("stops following when the followed user leaves presence", () => {
    const { result } = renderPresence({ socket });
    act(() => {
      triggerSocketEvent(socket, "room-presence", { users: [{ userId: "u-target", name: "T" }] });
    });
    act(() => { result.current.setFollowingUserId("u-target"); });
    expect(result.current.followingUserId).toBe("u-target");
    act(() => {
      triggerSocketEvent(socket, "room-presence", { users: [] });
    });
    expect(result.current.followingUserId).toBeNull();
  });

  test("viewport-updated only applies when matching the followed user", () => {
    const { result, applyingRemoteCounter, api } = renderPresence({ socket });
    act(() => {
      triggerSocketEvent(socket, "room-presence", { users: [{ userId: "u-target", name: "T" }] });
    });
    act(() => { result.current.setFollowingUserId("u-target"); });
    act(() => {
      triggerSocketEvent(socket, "viewport-updated", { userId: "OTHER", scrollX: 9, scrollY: 9, zoom: 2 });
    });
    expect(api.updateScene).not.toHaveBeenCalled();
    act(() => {
      triggerSocketEvent(socket, "viewport-updated", { userId: "u-target", scrollX: 100, scrollY: 200, zoom: 2 });
    });
    expect(api.updateScene).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(applyingRemoteCounter.current).toBe(0);
  });

  test("provide-viewport responds with current viewport-update", () => {
    const api = createExcalidrawApiStub({ appState: { scrollX: 5, scrollY: 7, zoom: { value: 1.5 } } });
    renderPresence({ socket, api });
    act(() => { triggerSocketEvent(socket, "provide-viewport", {}); });
    expect(socket.emit).toHaveBeenCalledWith(
      "viewport-update",
      expect.objectContaining({ roomId: "diag-1", scrollX: 5, scrollY: 7, zoom: 1.5 }),
    );
  });

  test("hand-raised / hand-lowered update raisedHands set", () => {
    const { result } = renderPresence({ socket });
    act(() => { triggerSocketEvent(socket, "hand-raised", { userId: "u3" }); });
    expect(result.current.raisedHands.has("u3")).toBe(true);
    act(() => { triggerSocketEvent(socket, "hand-lowered", { userId: "u3" }); });
    expect(result.current.raisedHands.has("u3")).toBe(false);
  });

  test("raiseHand emits, marks self in raisedHands, sets isHandRaised=true", () => {
    const { result } = renderPresence({ socket, selfUserId: "me" });
    act(() => { result.current.raiseHand(); });
    expect(socket.emit).toHaveBeenCalledWith("raise-hand", { roomId: "diag-1" });
    expect(result.current.isHandRaised).toBe(true);
    expect(result.current.raisedHands.has("me")).toBe(true);
  });

  test("lowerHand emits and unsets isHandRaised", () => {
    const { result } = renderPresence({ socket, selfUserId: "me" });
    act(() => { result.current.raiseHand(); });
    act(() => { result.current.lowerHand(); });
    expect(socket.emit).toHaveBeenCalledWith("lower-hand", { roomId: "diag-1" });
    expect(result.current.isHandRaised).toBe(false);
    expect(result.current.raisedHands.has("me")).toBe(false);
  });

  test("raised hands are dropped when their user leaves presence", () => {
    const { result } = renderPresence({ socket });
    act(() => { triggerSocketEvent(socket, "hand-raised", { userId: "ghost" }); });
    act(() => { triggerSocketEvent(socket, "room-presence", { users: [] }); });
    expect(result.current.raisedHands.has("ghost")).toBe(false);
  });
});

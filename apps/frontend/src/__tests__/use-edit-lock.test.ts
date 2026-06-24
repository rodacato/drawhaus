import { describe, test, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEditLock } from "../lib/hooks/collaboration/useEditLock";
import {
  createMockSocket,
  makeRef,
  triggerSocketEvent,
  type MockSocket,
} from "./_helpers/mock-socket";
import type { Socket } from "socket.io-client";

function renderEditLock(opts: {
  socket: MockSocket | null;
  generation?: number;
  selfUserId?: string | null;
}) {
  const socketRef = makeRef(opts.socket as unknown as Socket | null);
  const initialSelfUserId = "selfUserId" in opts ? opts.selfUserId ?? null : "user-1";
  return renderHook(
    ({ generation, selfUserId }) =>
      useEditLock({
        socketRef,
        socketGeneration: generation,
        selfUserId,
      }),
    {
      initialProps: {
        generation: opts.generation ?? 1,
        selfUserId: initialSelfUserId,
      },
    },
  );
}

describe("useEditLock", () => {
  let socket: MockSocket;

  beforeEach(() => {
    socket = createMockSocket();
  });

  test("reports hasEditLock=true when selfUserId is set", () => {
    const { result } = renderEditLock({ socket, selfUserId: "user-42" });
    expect(result.current.hasEditLock).toBe(true);
    expect(result.current.editLockHolder).toEqual({ userId: "user-42", userName: "" });
  });

  test("reports hasEditLock=false when selfUserId is null", () => {
    const { result } = renderEditLock({ socket, selfUserId: null });
    expect(result.current.hasEditLock).toBe(false);
    expect(result.current.editLockHolder).toBeNull();
  });

  test("default returns: queuePosition=0 and lockTimeRemaining=null", () => {
    const { result } = renderEditLock({ socket });
    expect(result.current.queuePosition).toBe(0);
    expect(result.current.lockTimeRemaining).toBeNull();
  });

  test("tryAcquireEditLock and touchCountdown are no-op functions", () => {
    const { result } = renderEditLock({ socket });
    expect(() => result.current.tryAcquireEditLock()).not.toThrow();
    expect(() => result.current.touchCountdown()).not.toThrow();
  });

  test("subscribes to room-joined and the three edit-lock-* events on mount", () => {
    renderEditLock({ socket });
    const events = [...socket.handlers.keys()];
    expect(events).toEqual(
      expect.arrayContaining([
        "room-joined",
        "edit-lock-status",
        "edit-lock-acquired",
        "edit-lock-queued",
      ]),
    );
  });

  test("unsubscribes all listeners on unmount", () => {
    const { unmount } = renderEditLock({ socket });
    unmount();
    expect(socket.handlers.get("room-joined")?.size ?? 0).toBe(0);
    expect(socket.handlers.get("edit-lock-status")?.size ?? 0).toBe(0);
    expect(socket.handlers.get("edit-lock-acquired")?.size ?? 0).toBe(0);
    expect(socket.handlers.get("edit-lock-queued")?.size ?? 0).toBe(0);
  });

  test("does nothing when socketRef is null", () => {
    const { result } = renderHook(() =>
      useEditLock({
        socketRef: makeRef(null as unknown as Socket),
        socketGeneration: 1,
        selfUserId: "u1",
      }),
    );
    expect(result.current.hasEditLock).toBe(true);
  });

  test("re-subscribes when socketGeneration changes", () => {
    const { rerender } = renderEditLock({ socket, generation: 1 });
    const offCallsBefore = socket.off.mock.calls.length;
    rerender({ generation: 2, selfUserId: "user-1" });
    expect(socket.off.mock.calls.length).toBeGreaterThan(offCallsBefore);
  });

  test("edit-lock events are swallowed silently (no throw)", () => {
    renderEditLock({ socket });
    expect(() => {
      triggerSocketEvent(socket, "edit-lock-status", { holder: "x" });
      triggerSocketEvent(socket, "edit-lock-acquired", { holder: "y" });
      triggerSocketEvent(socket, "edit-lock-queued", { position: 3 });
    }).not.toThrow();
  });
});

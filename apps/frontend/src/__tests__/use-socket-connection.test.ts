import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createMockSocket, triggerSocketEvent, triggerManagerEvent, type MockSocket } from "./_helpers/mock-socket";

let nextSocket: MockSocket;

vi.mock("../lib/services/socket", () => ({
  createSocket: () => nextSocket,
}));

// Import AFTER the mock is registered
import { useSocketConnection } from "../lib/hooks/collaboration/useSocketConnection";

const authJoin = { type: "authenticated" as const, roomId: "room-1" };
const guestJoin = { type: "guest" as const, shareToken: "tok-9", guestName: "Visitor" };

describe("useSocketConnection", () => {
  beforeEach(() => {
    nextSocket = createMockSocket({ id: "sock-1" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  test("starts in 'connecting' state and increments socketGeneration", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    expect(result.current.connectionState).toBe("connecting");
    expect(result.current.socketGeneration).toBeGreaterThan(0);
    expect(result.current.socketRef.current).toBe(nextSocket);
  });

  test("on 'connect' moves to 'connected' and emits join-room (authenticated)", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "connect"); });
    expect(result.current.connectionState).toBe("connected");
    expect(nextSocket.emit).toHaveBeenCalledWith("join-room", { roomId: "room-1" });
  });

  test("on 'connect' (guest mode) emits join-room-guest with token and name", () => {
    renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: guestJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "connect"); });
    expect(nextSocket.emit).toHaveBeenCalledWith("join-room-guest", {
      shareToken: "tok-9",
      guestName: "Visitor",
    });
  });

  test("'connect_error' sets connectionState='error' and surfaces the message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "connect_error", { message: "no route" }); });
    expect(result.current.connectionState).toBe("error");
    expect(result.current.connectionError).toBe("no route");
  });

  test("'disconnect' sets state to 'disconnected'", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "connect"); });
    act(() => { triggerSocketEvent(nextSocket, "disconnect", "transport close"); });
    expect(result.current.connectionState).toBe("disconnected");
  });

  test("'room-error' transitions to error with the server message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "room-error", { message: "denied" }); });
    expect(result.current.connectionState).toBe("error");
    expect(result.current.connectionError).toBe("denied");
  });

  test("'room-joined' populates userRole and selfUserId and clears the error", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "room-joined", { role: "editor", userId: "u-77" }); });
    expect(result.current.userRole).toBe("editor");
    expect(result.current.selfUserId).toBe("u-77");
    expect(result.current.connectionError).toBeNull();
  });

  test("manager 'reconnect_attempt' moves back to 'connecting'", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "connect"); });
    act(() => { triggerManagerEvent(nextSocket, "reconnect_attempt"); });
    expect(result.current.connectionState).toBe("connecting");
  });

  test("manager 'reconnect' rejoins the room", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerSocketEvent(nextSocket, "connect"); });
    nextSocket.emit.mockClear();
    act(() => { triggerManagerEvent(nextSocket, "reconnect"); });
    expect(result.current.connectionState).toBe("connected");
    expect(nextSocket.emit).toHaveBeenCalledWith("join-room", { roomId: "room-1" });
  });

  test("manager 'reconnect_failed' sets error state with Spanish message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => { triggerManagerEvent(nextSocket, "reconnect_failed"); });
    expect(result.current.connectionState).toBe("error");
    expect(result.current.connectionError).toMatch(/reconectar/i);
  });

  test("disconnects the socket on unmount and clears the ref", () => {
    const { result, unmount } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    expect(result.current.socketRef.current).toBe(nextSocket);
    unmount();
    expect(nextSocket.disconnect).toHaveBeenCalled();
    expect(result.current.socketRef.current).toBeNull();
  });

  test("after unmount events do NOT mutate state (cancelled flag)", async () => {
    const { result, unmount } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    unmount();
    act(() => { triggerSocketEvent(nextSocket, "room-joined", { role: "admin", userId: "after" }); });
    await waitFor(() => {
      expect(result.current.userRole).toBeNull();
      expect(result.current.selfUserId).toBeNull();
    });
  });

  test("changing diagramId tears down the old socket and creates a new one", () => {
    const first = nextSocket;
    const { rerender } = renderHook(
      ({ id }) => useSocketConnection({ diagramId: id, joinMode: authJoin }),
      { initialProps: { id: "d1" } },
    );
    nextSocket = createMockSocket({ id: "sock-2" });
    rerender({ id: "d2" });
    expect(first.disconnect).toHaveBeenCalled();
  });
});

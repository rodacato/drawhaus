import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  createMockSocket,
  triggerSocketEvent,
  triggerManagerEvent,
  simulateReconnect,
  type MockSocket,
} from "./_helpers/mock-socket";

let nextSocket: MockSocket;
let handshakeAuth: unknown;

vi.mock("../lib/services/socket", () => ({
  createSocket: (auth?: unknown) => {
    handshakeAuth = auth;
    return nextSocket;
  },
}));

// Import AFTER the mock is registered
import { useSocketConnection } from "../lib/hooks/collaboration/useSocketConnection";

const authJoin = { type: "authenticated" as const, roomId: "room-1" };
const guestJoin = { type: "guest" as const, shareToken: "tok-9", guestName: "Visitor" };

describe("useSocketConnection", () => {
  beforeEach(() => {
    handshakeAuth = "not-created";
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
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
    });
    expect(result.current.connectionState).toBe("connected");
    expect(nextSocket.emit).toHaveBeenCalledWith("join-room", { roomId: "room-1" });
  });

  test("on 'connect' (guest mode) emits join-room-guest with token and name", () => {
    renderHook(() => useSocketConnection({ diagramId: "d1", joinMode: guestJoin }));
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
    });
    expect(nextSocket.emit).toHaveBeenCalledWith("join-room-guest", {
      shareToken: "tok-9",
      guestName: "Visitor",
    });
  });

  test("'connect_error' sets connectionState='error' and surfaces the message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect_error", { message: "no route" });
    });
    expect(result.current.connectionState).toBe("error");
    expect(result.current.connectionError).toBe("no route");
  });

  test("a guest socket presents its share token at the handshake", () => {
    renderHook(() => useSocketConnection({ diagramId: "d1", joinMode: guestJoin }));
    expect(handshakeAuth).toEqual({ shareToken: "tok-9" });
  });

  test("an authenticated socket presents no share token and relies on its cookie", () => {
    renderHook(() => useSocketConnection({ diagramId: "d1", joinMode: authJoin }));
    expect(handshakeAuth).toBeUndefined();
  });

  const refused = { message: "Not authorized to connect. Reload the page." };

  test.each([
    ["authenticated", "unauthenticated", authJoin, /sesión terminó/],
    ["guest", "unauthenticated", guestJoin, /enlace ya no es válido/],
    ["guest", "server-error", guestJoin, /verificar tu acceso/],
  ])(
    "a refused %s handshake (%s) says why instead of the raw message",
    (_, reason, joinMode, copy) => {
      const { result } = renderHook(() => useSocketConnection({ diagramId: "d1", joinMode }));
      nextSocket.active = false;
      act(() => {
        triggerSocketEvent(nextSocket, "connect_error", { ...refused, data: { reason } });
      });
      expect(result.current.connectionState).toBe("error");
      expect(result.current.connectionError).toMatch(copy);
    },
  );

  test("a transient connect_error on a socket still retrying keeps the transport message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: guestJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect_error", { message: "websocket error" });
    });
    expect(result.current.connectionError).toBe("websocket error");
  });

  test("'disconnect' sets state to 'disconnected'", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
    });
    act(() => {
      triggerSocketEvent(nextSocket, "disconnect", "transport close");
    });
    expect(result.current.connectionState).toBe("disconnected");
  });

  test.each([
    ["authenticated", "session-ended", authJoin, /sesión terminó/],
    ["guest", "share-link-revoked", guestJoin, /enlace ya no es válido/],
    ["guest", "session-ended", guestJoin, /sesión terminó/],
    ["guest", undefined, guestJoin, /enlace ya no es válido/],
  ])(
    "a %s board closed by the server (%s) says why instead of reconnecting",
    (_, reason, joinMode, copy) => {
      const { result } = renderHook(() => useSocketConnection({ diagramId: "d1", joinMode }));
      act(() => {
        triggerSocketEvent(nextSocket, "connect");
      });
      act(() => {
        if (reason) triggerSocketEvent(nextSocket, "access-revoked", { reason });
        triggerSocketEvent(nextSocket, "disconnect", "io server disconnect");
      });
      expect(result.current.connectionState).toBe("error");
      expect(result.current.connectionError).toMatch(copy);
    },
  );

  test("a notice without a server disconnect changes nothing on its own", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
      triggerSocketEvent(nextSocket, "access-revoked", { reason: "session-ended" });
    });
    act(() => {
      triggerSocketEvent(nextSocket, "disconnect", "transport close");
    });
    expect(result.current.connectionState).toBe("disconnected");
    expect(result.current.connectionError).toBeNull();
  });

  test("'room-error' transitions to error with the server message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "room-error", { message: "denied" });
    });
    expect(result.current.connectionState).toBe("error");
    expect(result.current.connectionError).toBe("denied");
  });

  test("'room-joined' populates userRole and selfUserId and clears the error", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "room-joined", { role: "editor", userId: "u-77" });
    });
    expect(result.current.userRole).toBe("editor");
    expect(result.current.selfUserId).toBe("u-77");
    expect(result.current.connectionError).toBeNull();
  });

  test("manager 'reconnect_attempt' moves back to 'connecting'", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
    });
    act(() => {
      triggerManagerEvent(nextSocket, "reconnect_attempt");
    });
    expect(result.current.connectionState).toBe("connecting");
  });

  test("each reconnect joins the room exactly once and ends 'connected'", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
    });
    nextSocket.emit.mockClear();

    for (let cycle = 1; cycle <= 2; cycle++) {
      act(() => {
        triggerSocketEvent(nextSocket, "disconnect", "transport close");
        triggerManagerEvent(nextSocket, "reconnect_attempt", 1);
      });
      expect(result.current.connectionState).toBe("connecting");
      act(() => {
        simulateReconnect(nextSocket);
      });
      expect(result.current.connectionState).toBe("connected");
      const joins = nextSocket.emit.mock.calls.filter(([event]) => event === "join-room");
      expect(joins).toEqual(
        Array.from({ length: cycle }, () => ["join-room", { roomId: "room-1" }]),
      );
    }
  });

  test("a reconnect clears a previous connection error", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerSocketEvent(nextSocket, "connect_error", { message: "no route" });
    });
    act(() => {
      simulateReconnect(nextSocket);
    });
    expect(result.current.connectionState).toBe("connected");
    expect(result.current.connectionError).toBeNull();
  });

  test("a guest reconnect re-sends join-room-guest once, never join-room", () => {
    renderHook(() => useSocketConnection({ diagramId: "d1", joinMode: guestJoin }));
    act(() => {
      triggerSocketEvent(nextSocket, "connect");
    });
    nextSocket.emit.mockClear();
    act(() => {
      simulateReconnect(nextSocket);
    });
    expect(nextSocket.emit.mock.calls).toEqual([
      ["join-room-guest", { shareToken: "tok-9", guestName: "Visitor" }],
    ]);
  });

  test("a reconnect attempt alone does not join the room", () => {
    renderHook(() => useSocketConnection({ diagramId: "d1", joinMode: authJoin }));
    act(() => {
      triggerManagerEvent(nextSocket, "reconnect_attempt", 1);
    });
    expect(nextSocket.emit).not.toHaveBeenCalled();
  });

  test("manager 'reconnect_failed' sets error state with Spanish message", () => {
    const { result } = renderHook(() =>
      useSocketConnection({ diagramId: "d1", joinMode: authJoin }),
    );
    act(() => {
      triggerManagerEvent(nextSocket, "reconnect_failed");
    });
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
    act(() => {
      triggerSocketEvent(nextSocket, "room-joined", { role: "admin", userId: "after" });
    });
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

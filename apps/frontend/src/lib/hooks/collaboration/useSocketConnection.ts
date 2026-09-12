import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/services/socket";
import type { ConnectionState } from "@/lib/types";
import type { JoinMode } from "./types";

export interface UseSocketConnectionParams {
  diagramId: string;
  joinMode: JoinMode;
}

export interface UseSocketConnectionReturn {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  connectionState: ConnectionState;
  connectionError: string | null;
  userRole: string | null;
  selfUserId: string | null;
}

type ConnectError = Error & { data?: { reason?: string } };

function refusalMessage(joinMode: JoinMode, reason: string | undefined): string {
  if (reason === "unauthenticated") {
    return joinMode.type === "guest"
      ? "Este enlace ya no es válido. Pide uno nuevo."
      : "Tu sesión terminó. Recarga la página para volver a entrar.";
  }
  return "No se pudo verificar tu acceso. Recarga la página.";
}

export function useSocketConnection({
  diagramId,
  joinMode,
}: UseSocketConnectionParams): UseSocketConnectionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [socketGeneration, setSocketGeneration] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    const socket = createSocket(
      joinMode.type === "guest" ? { shareToken: joinMode.shareToken } : undefined,
    );
    socketRef.current = socket;
    setSocketGeneration((g) => g + 1);

    function joinRoom() {
      if (cancelled) return;
      if (joinMode.type === "authenticated") {
        socket.emit("join-room", { roomId: joinMode.roomId });
      } else {
        socket.emit("join-room-guest", {
          shareToken: joinMode.shareToken,
          guestName: joinMode.guestName,
        });
      }
    }

    socket.on("connect", () => {
      if (cancelled) {
        return;
      }
      setConnectionState("connected");
      setConnectionError(null);
      joinRoom();
    });
    socket.on("connect_error", (err: ConnectError) => {
      if (cancelled) {
        return;
      }
      console.warn("Socket connect_error:", err.message);
      setConnectionState("error");
      // An inactive socket was refused by the server and socket.io will not retry it.
      setConnectionError(socket.active ? err.message : refusalMessage(joinMode, err.data?.reason));
    });
    socket.on("disconnect", (reason) => {
      if (cancelled) {
        return;
      }
      console.warn("Socket disconnected:", reason);
      setConnectionState("disconnected");
    });
    socket.on("room-error", ({ message }: { message: string }) => {
      if (cancelled) {
        return;
      }
      console.warn("Room error:", message);
      setConnectionError(message);
      setConnectionState("error");
    });

    // No manager "reconnect" handler: socket.io fires "connect" on every reconnection,
    // and a second join would make the server resend scene-from-db over the canvas.
    socket.io.on("reconnect_attempt", () => {
      if (cancelled) {
        return;
      }
      setConnectionState("connecting");
    });
    socket.io.on("reconnect_failed", () => {
      if (cancelled) {
        return;
      }
      setConnectionState("error");
      setConnectionError("No se pudo reconectar al servidor");
    });

    socket.on("room-joined", ({ role, userId }: { role?: string; userId?: string }) => {
      if (cancelled) return;
      if (role) setUserRole(role);
      if (userId) setSelfUserId(userId);
      setConnectionError(null);
    });

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [diagramId]);

  return { socketRef, socketGeneration, connectionState, connectionError, userRole, selfUserId };
}

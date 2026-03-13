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
  connectionState: ConnectionState;
  connectionError: string | null;
  userRole: string | null;
  selfUserId: string | null;
}

export function useSocketConnection({
  diagramId,
  joinMode,
}: UseSocketConnectionParams): UseSocketConnectionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    function joinRoom() {
      if (joinMode.type === "authenticated") {
        socket.emit("join-room", { roomId: joinMode.roomId });
      } else {
        socket.emit("join-room-guest", { shareToken: joinMode.shareToken, guestName: joinMode.guestName });
      }
    }

    socket.on("connect", () => { setConnectionState("connected"); setConnectionError(null); joinRoom(); });
    socket.on("connect_error", (err) => { console.warn("Socket connect_error:", err.message); setConnectionState("error"); setConnectionError(err.message); });
    socket.on("disconnect", (reason) => { console.warn("Socket disconnected:", reason); setConnectionState("disconnected"); });
    socket.on("room-error", ({ message }: { message: string }) => { console.warn("Room error:", message); setConnectionError(message); setConnectionState("error"); });

    socket.on("room-joined", ({ role, userId }: { role?: string; userId?: string }) => {
      if (role) setUserRole(role);
      if (userId) setSelfUserId(userId);
      setConnectionError(null);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [diagramId]);

  return { socketRef, connectionState, connectionError, userRole, selfUserId };
}

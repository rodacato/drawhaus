import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { CURSOR_THROTTLE_MS } from "@/lib/collaboration";
import type { PresenceUser, CursorInfo, ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";

export interface UsePresenceParams {
  socketRef: React.MutableRefObject<Socket | null>;
  diagramId: string;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  applyingRemoteCounter: React.MutableRefObject<number>;
  followingUserIdRef: React.MutableRefObject<string | null>;
  selfUserId: string | null;
}

export interface UsePresenceReturn {
  presenceUsers: PresenceUserWithSelf[];
  cursors: Record<string, CursorInfo>;
  followingUserId: string | null;
  setFollowingUserId: (id: string | null) => void;
  onPointerMove: (e: { clientX: number; clientY: number }) => void;
}

export function usePresence({
  socketRef,
  diagramId,
  excalidrawApiRef,
  applyingRemoteCounter,
  followingUserIdRef,
  selfUserId,
}: UsePresenceParams): UsePresenceReturn {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const lastCursorEmitTime = useRef(0);

  /* ─── sync followingUserIdRef ─── */
  useEffect(() => { followingUserIdRef.current = followingUserId; }, [followingUserId]);

  /* ─── stale cursor cleanup ─── */
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next: Record<string, CursorInfo> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.lastSeen < 5000) next[k] = v;
        }
        return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ─── stop following if user leaves ─── */
  useEffect(() => {
    if (followingUserId && !presenceUsers.some((u) => u.userId === followingUserId)) {
      setFollowingUserId(null);
    }
  }, [presenceUsers, followingUserId]);

  /* ─── socket event listeners for presence ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handlePresence = ({ users }: { users: PresenceUser[] }) => { setPresenceUsers(users); };
    const handleCursorMoved = ({ userId, name: cursorName, x, y }: { userId: string; name: string; x: number; y: number }) => {
      setCursors((prev) => ({ ...prev, [userId]: { name: cursorName, x, y, lastSeen: Date.now() } }));
    };
    const handleCursorLeft = ({ userId }: { userId: string }) => {
      setCursors((prev) => { const next = { ...prev }; delete next[userId]; return next; });
    };
    const handleViewport = ({ userId, scrollX, scrollY, zoom }: { userId: string; scrollX: number; scrollY: number; zoom: number }) => {
      if (followingUserIdRef.current !== userId) return;
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ appState: { scrollX, scrollY, zoom: { value: zoom } } });
      requestAnimationFrame(() => { applyingRemoteCounter.current -= 1; });
    };

    socket.on("room-presence", handlePresence);
    socket.on("cursor-moved", handleCursorMoved);
    socket.on("cursor-left", handleCursorLeft);
    socket.on("viewport-updated", handleViewport);

    return () => {
      socket.off("room-presence", handlePresence);
      socket.off("cursor-moved", handleCursorMoved);
      socket.off("cursor-left", handleCursorLeft);
      socket.off("viewport-updated", handleViewport);
    };
  }, [socketRef.current]);

  /* ─── cursor emit ─── */
  const onPointerMove = useCallback((e: { clientX: number; clientY: number }) => {
    const now = Date.now();
    if (now - lastCursorEmitTime.current >= CURSOR_THROTTLE_MS) {
      lastCursorEmitTime.current = now;
      socketRef.current?.emit("cursor-move", { roomId: diagramId, x: e.clientX, y: e.clientY });
    }
  }, [diagramId]);

  /* ─── derived: map presence with self ─── */
  const mappedPresenceUsers: PresenceUserWithSelf[] = presenceUsers.map((u) => ({ ...u, isSelf: u.userId === selfUserId }));

  return { presenceUsers: mappedPresenceUsers, cursors, followingUserId, setFollowingUserId, onPointerMove };
}

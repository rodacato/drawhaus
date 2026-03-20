import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { CURSOR_THROTTLE_MS } from "@/lib/collaboration";
import type { PresenceUser, CursorInfo, ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";

export interface UsePresenceParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  diagramId: string;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  applyingRemoteCounter: React.MutableRefObject<number>;
  followingUserIdRef: React.MutableRefObject<string | null>;
  followedViewportRef: React.MutableRefObject<{ scrollX: number; scrollY: number; zoom: number } | null>;
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
  socketGeneration,
  diagramId,
  excalidrawApiRef,
  applyingRemoteCounter,
  followingUserIdRef,
  followedViewportRef,
  selfUserId,
}: UsePresenceParams): UsePresenceReturn {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const lastCursorEmitTime = useRef(0);

  /* ─── Mejora 3: cursors in ref + periodic sync to state ─── */
  const cursorsRef = useRef<Record<string, CursorInfo>>({});
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const cursorsDirty = useRef(false);

  useEffect(() => {
    let rafId: number;
    const sync = () => {
      if (cursorsDirty.current) {
        cursorsDirty.current = false;
        setCursors({ ...cursorsRef.current });
      }
      rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* ─── sync followingUserIdRef ─── */
  useEffect(() => {
    followingUserIdRef.current = followingUserId;
    if (!followingUserId) followedViewportRef.current = null;
  }, [followingUserId]);

  /* ─── stale cursor cleanup ─── */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [k, v] of Object.entries(cursorsRef.current)) {
        if (now - v.lastSeen >= 5000) {
          delete cursorsRef.current[k];
          changed = true;
        }
      }
      if (changed) {
        cursorsDirty.current = true;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ─── stop following if user leaves ─── */
  useEffect(() => {
    if (followingUserId && !presenceUsers.some((u) => u.userId === followingUserId)) {
      setFollowingUserId(null);
    }
  }, [presenceUsers, followingUserId]);

  /* ─── Mejora 2: request viewport when starting to follow ─── */
  useEffect(() => {
    if (followingUserId) {
      socketRef.current?.emit("request-viewport", { roomId: diagramId, targetUserId: followingUserId });
    }
  }, [followingUserId, diagramId]);

  /* ─── Mejora 1: socket event listeners — use socketGeneration as dep ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handlePresence = ({ users }: { users: PresenceUser[] }) => { setPresenceUsers(users); };

    const handleCursorMoved = ({ userId, name: cursorName, x, y }: { userId: string; name: string; x: number; y: number }) => {
      cursorsRef.current[userId] = { name: cursorName, x, y, lastSeen: Date.now() };
      cursorsDirty.current = true;
    };

    const handleCursorLeft = ({ userId }: { userId: string }) => {
      delete cursorsRef.current[userId];
      cursorsDirty.current = true;
    };

    /* ─── Mejora 5: use setTimeout(0) instead of rAF for applyingRemoteCounter ─── */
    const handleViewport = ({ userId, scrollX, scrollY, zoom }: { userId: string; scrollX: number; scrollY: number; zoom: number }) => {
      if (followingUserIdRef.current !== userId) return;
      followedViewportRef.current = { scrollX, scrollY, zoom };
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ appState: { scrollX, scrollY, zoom: { value: zoom } } });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    };

    /* ─── Mejora 2: respond to viewport requests from followers ─── */
    const handleProvideViewport = () => {
      const api = excalidrawApiRef.current;
      if (!api) return;
      const appState = api.getAppState();
      const zoom = (appState.zoom as { value: number })?.value ?? 1;
      socket.emit("viewport-update", {
        roomId: diagramId,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom,
      });
    };

    socket.on("room-presence", handlePresence);
    socket.on("cursor-moved", handleCursorMoved);
    socket.on("cursor-left", handleCursorLeft);
    socket.on("viewport-updated", handleViewport);
    socket.on("provide-viewport", handleProvideViewport);

    return () => {
      socket.off("room-presence", handlePresence);
      socket.off("cursor-moved", handleCursorMoved);
      socket.off("cursor-left", handleCursorLeft);
      socket.off("viewport-updated", handleViewport);
      socket.off("provide-viewport", handleProvideViewport);
    };
  }, [socketGeneration, diagramId]);

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

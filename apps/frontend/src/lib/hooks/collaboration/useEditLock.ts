import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { LockHolderInfo } from "./types";

/**
 * Stub edit lock hook for concurrent editing.
 * Always reports that the current user has the edit lock.
 * Lock events are still consumed for backwards compatibility
 * but have no functional effect.
 */

interface UseEditLockParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  selfUserId: string | null;
}

export function useEditLock({ socketRef, socketGeneration, selfUserId }: UseEditLockParams) {
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function handleRoomJoined({ roomId }: { roomId: string }) {
      roomIdRef.current = roomId;
    }

    socket.on("room-joined", handleRoomJoined);

    // Consume lock events silently for backwards compat
    const noop = () => {};
    socket.on("edit-lock-status", noop);
    socket.on("edit-lock-acquired", noop);
    socket.on("edit-lock-queued", noop);

    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("edit-lock-status", noop);
      socket.off("edit-lock-acquired", noop);
      socket.off("edit-lock-queued", noop);
    };
  }, [socketRef, socketGeneration]);

  const tryAcquireEditLock = useCallback(() => {
    // No-op: everyone can edit concurrently
  }, []);

  const touchCountdown = useCallback(() => {
    // No-op: no countdown in concurrent editing
  }, []);

  return {
    editLockHolder: selfUserId ? { userId: selfUserId, userName: "" } as LockHolderInfo : null,
    hasEditLock: selfUserId !== null,
    tryAcquireEditLock,
    queuePosition: 0,
    lockTimeRemaining: null as number | null,
    touchCountdown,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { LockHolderInfo } from "./types";

interface UseEditLockParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  selfUserId: string | null;
}

export function useEditLock({ socketRef, socketGeneration, selfUserId }: UseEditLockParams) {
  const [lockHolder, setLockHolder] = useState<LockHolderInfo | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const hasEditLock = lockHolder?.userId === selfUserId && selfUserId !== null;

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function handleLockStatus({ holder }: { roomId: string; holder: LockHolderInfo | null }) {
      setLockHolder(holder);
    }

    function handleLockAcquired({ holder }: { roomId: string; holder: LockHolderInfo }) {
      setLockHolder(holder);
    }

    function handleRoomJoined({ roomId }: { roomId: string }) {
      roomIdRef.current = roomId;
    }

    socket.on("edit-lock-status", handleLockStatus);
    socket.on("edit-lock-acquired", handleLockAcquired);
    socket.on("room-joined", handleRoomJoined);

    return () => {
      socket.off("edit-lock-status", handleLockStatus);
      socket.off("edit-lock-acquired", handleLockAcquired);
      socket.off("room-joined", handleRoomJoined);
    };
  }, [socketRef, socketGeneration]);

  const tryAcquireEditLock = useCallback(() => {
    const socket = socketRef.current;
    const roomId = roomIdRef.current;
    if (!socket || !roomId) return;
    socket.emit("request-edit-lock", { roomId });
  }, [socketRef]);

  return {
    editLockHolder: lockHolder,
    hasEditLock,
    tryAcquireEditLock,
  };
}

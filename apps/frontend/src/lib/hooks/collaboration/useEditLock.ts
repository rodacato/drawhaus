import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { LockHolderInfo } from "./types";

const LOCK_TIMEOUT_MS = 2_500; // matches backend INACTIVITY_TIMEOUT_MS
const COUNTDOWN_TICK_MS = 100;

interface UseEditLockParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  selfUserId: string | null;
}

export function useEditLock({ socketRef, socketGeneration, selfUserId }: UseEditLockParams) {
  const [lockHolder, setLockHolder] = useState<LockHolderInfo | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const lockAcquiredAtRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer — ticks while self holds the lock
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (lockAcquiredAtRef.current === null) {
      setLockTimeRemaining(null);
      return;
    }
    const tick = () => {
      if (lockAcquiredAtRef.current === null) return;
      const elapsed = Date.now() - lockAcquiredAtRef.current;
      const remaining = Math.max(0, LOCK_TIMEOUT_MS - elapsed);
      setLockTimeRemaining(remaining);
    };
    tick();
    countdownRef.current = setInterval(tick, COUNTDOWN_TICK_MS);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [lockHolder]);

  const hasEditLock = lockHolder?.userId === selfUserId && selfUserId !== null;

  // Reset countdown anchor when lock holder changes
  useEffect(() => {
    if (hasEditLock) {
      lockAcquiredAtRef.current = Date.now();
    } else {
      lockAcquiredAtRef.current = null;
    }
  }, [hasEditLock]);

  // Touch extends the countdown
  const touchCountdown = useCallback(() => {
    lockAcquiredAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function handleLockStatus({ holder }: { roomId: string; holder: LockHolderInfo | null }) {
      setLockHolder(holder);
      // If we no longer hold the lock and aren't in queue, clear position
      if (!holder || holder.userId !== selfUserId) {
        // Queue position is managed by edit-lock-queued event
      }
    }

    function handleLockAcquired({ holder }: { roomId: string; holder: LockHolderInfo }) {
      setLockHolder(holder);
      setQueuePosition(0);
    }

    function handleLockQueued({ position }: { roomId: string; position: number; holder: LockHolderInfo }) {
      setQueuePosition(position);
    }

    function handleRoomJoined({ roomId }: { roomId: string }) {
      roomIdRef.current = roomId;
    }

    socket.on("edit-lock-status", handleLockStatus);
    socket.on("edit-lock-acquired", handleLockAcquired);
    socket.on("edit-lock-queued", handleLockQueued);
    socket.on("room-joined", handleRoomJoined);

    return () => {
      socket.off("edit-lock-status", handleLockStatus);
      socket.off("edit-lock-acquired", handleLockAcquired);
      socket.off("edit-lock-queued", handleLockQueued);
      socket.off("room-joined", handleRoomJoined);
    };
  }, [socketRef, socketGeneration, selfUserId]);

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
    queuePosition,
    lockTimeRemaining,
    touchCountdown,
  };
}

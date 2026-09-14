import { useEffect, useEffectEvent, useRef } from "react";
import type { ExcalidrawApi } from "@/lib/types";
import type { ConnectionState } from "@/lib/types";
import {
  saveOfflineSnapshot,
  getOfflineSnapshot,
  deleteOfflineSnapshot,
  type OfflineSnapshot,
} from "@/lib/offline-storage";

const DEFAULT_graceMs = 5 * 60 * 1000;

export interface UseOfflineSnapshotParams {
  diagramId: string;
  connectionState: ConnectionState;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  selfUserId: string | null;
  selfUserName?: string;
  onOfflineSave?: () => void;
  onConflict?: (offlineSnapshot: OfflineSnapshot) => void;
  graceMs?: number;
}

export function useOfflineSnapshot({
  diagramId,
  connectionState,
  excalidrawApiRef,
  selfUserId,
  selfUserName,
  onOfflineSave,
  onConflict,
  graceMs = DEFAULT_graceMs,
}: UseOfflineSnapshotParams) {
  const prevConnectionState = useRef<ConnectionState>(connectionState);
  const hasOfflineEdits = useRef(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectedAtRef = useRef<number | null>(null);

  const saveSnapshot = useEffectEvent(() => {
    const api = excalidrawApiRef.current;
    if (!api || !selfUserId) return Promise.resolve(false);
    return saveOfflineSnapshot({
      diagramId,
      userId: selfUserId,
      userName: selfUserName ?? "Unknown",
      elements: [...api.getSceneElements()],
      appState: api.getAppState(),
      savedAt: new Date().toISOString(),
    }).then(() => true);
  });
  const offlineSaved = useEffectEvent(() => onOfflineSave?.());
  const reportConflict = useEffectEvent((snapshot: OfflineSnapshot) => onConflict?.(snapshot));

  useEffect(() => {
    const wasConnected = prevConnectionState.current === "connected";
    const isDisconnected = connectionState === "disconnected" || connectionState === "error";

    // Going offline: start grace period timer
    if (wasConnected && isDisconnected) {
      disconnectedAtRef.current = Date.now();

      // Clear any existing timer
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);

      offlineTimerRef.current = setTimeout(() => {
        // Still disconnected after grace period — save snapshot
        saveSnapshot()
          .then((saved) => {
            if (!saved) return;
            hasOfflineEdits.current = true;
            offlineSaved();
          })
          .catch(() => {});
      }, graceMs);
    }

    // Reconnected: cancel timer if still pending, check for conflict
    if (prevConnectionState.current !== "connected" && connectionState === "connected") {
      // Cancel pending offline save — reconnected before grace period
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }

      if (hasOfflineEdits.current) {
        getOfflineSnapshot(diagramId)
          .then((snapshot) => {
            if (snapshot) {
              reportConflict(snapshot);
            }
            hasOfflineEdits.current = false;
          })
          .catch(() => {});
      }

      disconnectedAtRef.current = null;
    }

    prevConnectionState.current = connectionState;
  }, [connectionState, diagramId, graceMs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, []);

  // Save on beforeunload if disconnected long enough
  const saveIfOfflineLongEnough = useEffectEvent(() => {
    const isOffline = connectionState === "disconnected" || connectionState === "error";
    const offlineLongEnough =
      disconnectedAtRef.current && Date.now() - disconnectedAtRef.current >= graceMs;
    if (isOffline && offlineLongEnough) saveSnapshot().catch(() => {});
  });

  useEffect(() => {
    const handleBeforeUnload = () => saveIfOfflineLongEnough();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    clearOfflineSnapshot: () => deleteOfflineSnapshot(diagramId),
  };
}

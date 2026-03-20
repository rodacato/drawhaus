import { useEffect, useRef } from "react";
import type { ExcalidrawApi } from "@/lib/types";
import type { ConnectionState } from "@/lib/types";
import { saveOfflineSnapshot, getOfflineSnapshot, deleteOfflineSnapshot, type OfflineSnapshot } from "@/lib/offline-storage";

const OFFLINE_GRACE_MS = 5 * 60 * 1000; // 5 minutes — wait before saving offline snapshot

export interface UseOfflineSnapshotParams {
  diagramId: string;
  connectionState: ConnectionState;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  selfUserId: string | null;
  selfUserName?: string;
  onOfflineSave?: () => void;
  onConflict?: (offlineSnapshot: OfflineSnapshot) => void;
}

export function useOfflineSnapshot({
  diagramId,
  connectionState,
  excalidrawApiRef,
  selfUserId,
  selfUserName,
  onOfflineSave,
  onConflict,
}: UseOfflineSnapshotParams) {
  const prevConnectionState = useRef<ConnectionState>(connectionState);
  const hasOfflineEdits = useRef(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectedAtRef = useRef<number | null>(null);

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
        const api = excalidrawApiRef.current;
        if (api && selfUserId) {
          const elements = api.getSceneElements() as unknown[];
          const appState = api.getAppState() as Record<string, unknown>;
          saveOfflineSnapshot({
            diagramId,
            userId: selfUserId,
            userName: selfUserName ?? "Unknown",
            elements,
            appState,
            savedAt: new Date().toISOString(),
          }).then(() => {
            hasOfflineEdits.current = true;
            onOfflineSave?.();
          }).catch(() => {});
        }
      }, OFFLINE_GRACE_MS);
    }

    // Reconnected: cancel timer if still pending, check for conflict
    if (prevConnectionState.current !== "connected" && connectionState === "connected") {
      // Cancel pending offline save — reconnected before grace period
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }

      if (hasOfflineEdits.current) {
        getOfflineSnapshot(diagramId).then((snapshot) => {
          if (snapshot) {
            onConflict?.(snapshot);
          }
          hasOfflineEdits.current = false;
        }).catch(() => {});
      }

      disconnectedAtRef.current = null;
    }

    prevConnectionState.current = connectionState;
  }, [connectionState, diagramId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, []);

  // Save on beforeunload if disconnected long enough
  useEffect(() => {
    function handleBeforeUnload() {
      const api = excalidrawApiRef.current;
      const isOffline = connectionState === "disconnected" || connectionState === "error";
      const offlineLongEnough = disconnectedAtRef.current && (Date.now() - disconnectedAtRef.current) >= OFFLINE_GRACE_MS;
      if (api && selfUserId && isOffline && offlineLongEnough) {
        const elements = api.getSceneElements() as unknown[];
        const appState = api.getAppState() as Record<string, unknown>;
        saveOfflineSnapshot({
          diagramId,
          userId: selfUserId,
          userName: selfUserName ?? "Unknown",
          elements,
          appState,
          savedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [connectionState, diagramId, selfUserId]);

  return {
    clearOfflineSnapshot: () => deleteOfflineSnapshot(diagramId),
  };
}

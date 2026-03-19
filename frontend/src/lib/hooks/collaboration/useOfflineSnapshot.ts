import { useEffect, useRef } from "react";
import type { ExcalidrawApi } from "@/lib/types";
import type { ConnectionState } from "@/lib/types";
import { saveOfflineSnapshot, getOfflineSnapshot, deleteOfflineSnapshot, type OfflineSnapshot } from "@/lib/offline-storage";

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

  // Save snapshot when going offline
  useEffect(() => {
    const wasConnected = prevConnectionState.current === "connected";
    const isDisconnected = connectionState === "disconnected" || connectionState === "error";

    if (wasConnected && isDisconnected) {
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
    }

    // Check for offline snapshot on reconnect
    if (prevConnectionState.current !== "connected" && connectionState === "connected") {
      if (hasOfflineEdits.current) {
        getOfflineSnapshot(diagramId).then((snapshot) => {
          if (snapshot) {
            onConflict?.(snapshot);
          }
          hasOfflineEdits.current = false;
        }).catch(() => {});
      }
    }

    prevConnectionState.current = connectionState;
  }, [connectionState, diagramId]);

  // Save on beforeunload if disconnected
  useEffect(() => {
    function handleBeforeUnload() {
      const api = excalidrawApiRef.current;
      if (api && selfUserId && (connectionState === "disconnected" || connectionState === "error")) {
        // Best-effort synchronous-ish save
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

import { useCallback, useMemo, useRef, useState } from "react";
import type { ExcalidrawApi } from "@/lib/types";

// Re-export types for consumers
export type { JoinMode, CollaborationOptions, SceneInfo, CollaborationState } from "./collaboration/types";
import type { CollaborationOptions, CollaborationState } from "./collaboration/types";

// Sub-hooks
import { useSocketConnection } from "./collaboration/useSocketConnection";
import { useSaveManager } from "./collaboration/useSaveManager";
import { usePresence } from "./collaboration/usePresence";
import { useSceneManager } from "./collaboration/useSceneManager";

export function useCollaboration({
  diagramId,
  canEdit,
  joinMode,
  initialElements,
  initialAppState,
}: CollaborationOptions): CollaborationState {
  /* ─── toolbar state (owned by parent, not a sub-hook concern) ─── */
  const [toolbarOpen, setToolbarOpen] = useState(false);

  /* ─── shared refs created in parent, passed to sub-hooks ─── */
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const applyingRemoteCounter = useRef(0);
  const activeSceneIdRef = useRef<string | null>(null);
  const followingUserIdRef = useRef<string | null>(null);
  const followedViewportRef = useRef<{ scrollX: number; scrollY: number; zoom: number } | null>(null);
  const pendingSceneRef = useRef<{ elements: unknown[] } | null>(null);

  const cacheKey = `drawhaus_scene_${diagramId}`;

  /* ─── initial data (with localStorage cache) ─── */
  const initialData = useMemo(() => {
    let elements = initialElements;
    let appState = initialAppState;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.elements) && parsed.elements.length > 0) elements = parsed.elements;
        if (parsed.appState) appState = parsed.appState;
      }
    } catch { /* ignore */ }
    return {
      elements,
      appState: { ...appState, collaborators: new Map(), gridModeEnabled: true, theme: "light", viewBackgroundColor: "#f8f9fc" },
    };
  }, [initialElements, initialAppState, cacheKey]);

  /* ─── 1. Socket connection ─── */
  const { socketRef, socketGeneration, connectionState, connectionError, userRole, selfUserId } = useSocketConnection({
    diagramId,
    joinMode,
  });

  /* ─── 2. Save manager ─── */
  const { saveState, saveLabel, saveColor, lastSavedAt, onChange, flushSave, cancelPendingTimers } = useSaveManager({
    socketRef,
    socketGeneration,
    diagramId,
    activeSceneIdRef,
    excalidrawApiRef,
    applyingRemoteCounter,
    followingUserIdRef,
    followedViewportRef,
    canEdit,
  });

  /* ─── 3. Presence ─── */
  const { presenceUsers, cursors, followingUserId, setFollowingUserId, onPointerMove } = usePresence({
    socketRef,
    socketGeneration,
    diagramId,
    excalidrawApiRef,
    applyingRemoteCounter,
    followingUserIdRef,
    followedViewportRef,
    selfUserId,
  });

  /* ─── 4. Scene manager ─── */
  const { scenes, activeSceneId, switchingScene, switchScene, createScene, deleteScene, renameScene } = useSceneManager({
    socketRef,
    socketGeneration,
    diagramId,
    excalidrawApiRef,
    applyingRemoteCounter,
    activeSceneIdRef,
    pendingSceneRef,
    cancelPendingTimers,
  });

  /* ─── excalidraw API init ─── */
  const onExcalidrawApi = useCallback((excalidrawApi: ExcalidrawApi) => {
    excalidrawApiRef.current = excalidrawApi;
    if (pendingSceneRef.current) {
      const pending = pendingSceneRef.current;
      pendingSceneRef.current = null;
      applyingRemoteCounter.current += 1;
      excalidrawApi.updateScene({ elements: pending.elements });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    }
  }, []);

  return {
    saveState, connectionState, connectionError,
    presenceUsers, cursors, userRole,
    followingUserId, setFollowingUserId, toolbarOpen, setToolbarOpen,
    initialData, canEdit, saveLabel, saveColor, lastSavedAt,
    scenes, activeSceneId, switchingScene,
    switchScene, createScene, deleteScene, renameScene,
    excalidrawApiRef, socketRef, onExcalidrawApi, onChange, onPointerMove, flushSave,
  };
}

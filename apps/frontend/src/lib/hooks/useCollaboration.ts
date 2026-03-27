import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawApi } from "@/lib/types";

// Re-export types for consumers
export type { JoinMode, CollaborationOptions, CollaborationState } from "./collaboration/types";
import type { CollaborationOptions, CollaborationState } from "./collaboration/types";

// Sub-hooks
import { useSocketConnection } from "./collaboration/useSocketConnection";
import { useEditLock } from "./collaboration/useEditLock";
import { useSaveManager } from "./collaboration/useSaveManager";
import { usePresence } from "./collaboration/usePresence";
import { useSceneManager } from "./collaboration/useSceneManager";

export function useCollaboration({
  diagramId,
  canEdit,
  joinMode,
  initialElements,
  initialAppState,
  canvasPrefs,
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

  /* ─── initial data (server-first, localStorage only as offline fallback) ─── */
  const initialData = useMemo(() => {
    let elements = initialElements;
    let appState = initialAppState;
    // Only use localStorage cache when server returned nothing (offline fallback)
    if (!elements || elements.length === 0) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.elements) && parsed.elements.length > 0) elements = parsed.elements;
          if (parsed.appState) appState = parsed.appState;
        }
      } catch { /* ignore */ }
    }
    return {
      elements,
      appState: { ...appState, ...canvasPrefs, collaborators: new Map(), theme: "light", viewModeEnabled: true },
    };
  }, [initialElements, initialAppState, cacheKey]);

  /* ─── 1. Socket connection ─── */
  const { socketRef, socketGeneration, connectionState, connectionError, userRole, selfUserId } = useSocketConnection({
    diagramId,
    joinMode,
  });

  /* ─── 2. Edit lock ─── */
  const editLock = useEditLock({ socketRef, socketGeneration, selfUserId });
  const hasEditLockRef = useRef(false);
  hasEditLockRef.current = editLock.hasEditLock;

  /* ─── 3. Save manager ─── */
  const { saveState, saveLabel, saveColor, lastSavedAt, onChange: rawOnChange, flushSave } = useSaveManager({
    socketRef,
    socketGeneration,
    diagramId,
    activeSceneIdRef,
    excalidrawApiRef,
    applyingRemoteCounter,
    followingUserIdRef,
    followedViewportRef,
    canEdit,
    hasEditLockRef,
  });

  // Wrap onChange to reset lock countdown on each edit
  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      editLock.touchCountdown();
      rawOnChange(elements, appState);
    },
    [rawOnChange, editLock.touchCountdown],
  );

  /* ─── 4. Presence ─── */
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

  /* ─── 5. Scene manager ─── */
  const { activeSceneId } = useSceneManager({
    socketRef,
    socketGeneration,
    excalidrawApiRef,
    applyingRemoteCounter,
    activeSceneIdRef,
    pendingSceneRef,
  });

  /* ─── 6. Force viewModeEnabled when user cannot edit (no lock or following) ─── */
  useEffect(() => {
    const api = excalidrawApiRef.current;
    if (!api) return;
    const viewMode = !canEdit || !editLock.hasEditLock || !!followingUserIdRef.current;
    applyingRemoteCounter.current += 1;
    api.updateScene({ appState: { viewModeEnabled: viewMode } });
    setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
  }, [editLock.hasEditLock, editLock.editLockHolder, canEdit]);

  /* ─── excalidraw API init ─── */
  const onExcalidrawApi = useCallback((excalidrawApi: ExcalidrawApi) => {
    excalidrawApiRef.current = excalidrawApi;
    // Don't call updateScene here — it fires during Excalidraw's constructor
    // before mount. viewModeEnabled is set via initialData.appState and the
    // useEffect above handles subsequent changes after mount.
    if (pendingSceneRef.current) {
      const pending = pendingSceneRef.current;
      pendingSceneRef.current = null;
      // Defer pending scene apply to after mount
      setTimeout(() => {
        applyingRemoteCounter.current += 1;
        excalidrawApi.updateScene({ elements: pending.elements });
        setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
      }, 0);
    }
  }, []);

  return {
    saveState, connectionState, connectionError, selfUserId,
    presenceUsers, cursors, userRole,
    followingUserId, setFollowingUserId, toolbarOpen, setToolbarOpen,
    initialData, canEdit, saveLabel, saveColor, lastSavedAt,
    activeSceneId,
    excalidrawApiRef, socketRef, onExcalidrawApi, onChange, onPointerMove, flushSave,
    // Edit lock
    editLockHolder: editLock.editLockHolder,
    hasEditLock: editLock.hasEditLock,
    tryAcquireEditLock: editLock.tryAcquireEditLock,
    queuePosition: editLock.queuePosition,
    lockTimeRemaining: editLock.lockTimeRemaining,
  };
}

import { useCallback, useMemo, useRef, useState } from "react";
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

const EDIT_ROLES = new Set(["owner", "editor"]);

export function useCollaboration({
  diagramId,
  joinMode,
  initialElements,
  initialAppState,
  canvasPrefs,
  onConflict,
  onRemoteDelete,
}: CollaborationOptions): CollaborationState {
  /* ─── toolbar state (owned by parent, not a sub-hook concern) ─── */
  const [toolbarOpen, setToolbarOpen] = useState(false);

  /* ─── shared refs created in parent, passed to sub-hooks ─── */
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const applyingRemoteCounter = useRef(0);
  const activeSceneIdRef = useRef<string | null>(null);
  const followingUserIdRef = useRef<string | null>(null);
  const followedViewportRef = useRef<{ scrollX: number; scrollY: number; zoom: number } | null>(
    null,
  );
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
          if (Array.isArray(parsed.elements) && parsed.elements.length > 0)
            elements = parsed.elements;
          if (parsed.appState) appState = parsed.appState;
        }
      } catch {
        /* ignore */
      }
    }
    return {
      elements,
      appState: {
        ...appState,
        ...canvasPrefs,
        collaborators: new Map(),
        theme: "light",
      },
    };
  }, [initialElements, initialAppState, cacheKey]);

  /* ─── 1. Socket connection ─── */
  const { socketRef, socketGeneration, connectionState, connectionError, userRole, selfUserId } =
    useSocketConnection({
      diagramId,
      joinMode,
    });
  // Only the room join knows the role; until it answers, the board stays read-only.
  const canEdit = userRole !== null && EDIT_ROLES.has(userRole);

  /* ─── 2. Edit lock (stub — concurrent editing) ─── */
  const editLock = useEditLock({ socketRef, socketGeneration, selfUserId });

  /* ─── 3. Save manager ─── */
  const {
    saveState,
    saveLabel,
    saveColor,
    lastSavedAt,
    onChange: rawOnChange,
    flushSave,
  } = useSaveManager({
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

  // Wrap onChange to reset lock countdown on each edit
  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      editLock.touchCountdown();
      rawOnChange(elements, appState);
    },
    [rawOnChange, editLock.touchCountdown],
  );

  /* ─── 4. Presence ─── */
  const {
    presenceUsers,
    cursors,
    followingUserId,
    setFollowingUserId,
    onPointerMove,
    raisedHands,
    raiseHand,
    lowerHand,
    isHandRaised,
  } = usePresence({
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
    onConflict,
    onRemoteDelete,
  });

  // Passed to Excalidraw as a prop: it applies at mount and on every change, whenever the
  // lazily loaded canvas and the room join happen to finish.
  const viewModeEnabled = !canEdit || followingUserId !== null;

  /* ─── excalidraw API init ─── */
  const onExcalidrawApi = useCallback((excalidrawApi: ExcalidrawApi) => {
    excalidrawApiRef.current = excalidrawApi;
    // Excalidraw calls this from its constructor, before mount, so the pending scene waits a tick.
    if (pendingSceneRef.current) {
      const pending = pendingSceneRef.current;
      pendingSceneRef.current = null;
      setTimeout(() => {
        applyingRemoteCounter.current += 1;
        excalidrawApi.updateScene({ elements: pending.elements });
        setTimeout(() => {
          applyingRemoteCounter.current -= 1;
        }, 0);
      }, 0);
    }
  }, []);

  return {
    saveState,
    connectionState,
    connectionError,
    selfUserId,
    presenceUsers,
    cursors,
    userRole,
    followingUserId,
    setFollowingUserId,
    toolbarOpen,
    setToolbarOpen,
    initialData,
    canEdit,
    viewModeEnabled,
    saveLabel,
    saveColor,
    lastSavedAt,
    activeSceneId,
    excalidrawApiRef,
    socketRef,
    onExcalidrawApi,
    onChange,
    onPointerMove,
    flushSave,
    // Edit lock
    editLockHolder: editLock.editLockHolder,
    hasEditLock: editLock.hasEditLock,
    tryAcquireEditLock: editLock.tryAcquireEditLock,
    queuePosition: editLock.queuePosition,
    lockTimeRemaining: editLock.lockTimeRemaining,
    // Raise hand
    raisedHands,
    raiseHand,
    lowerHand,
    isHandRaised,
  };
}

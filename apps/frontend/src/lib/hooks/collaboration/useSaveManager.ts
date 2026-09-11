import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  jsonSafe,
  getAdaptiveThrottleMs,
  VIEWPORT_THROTTLE_MS,
  SAVE_DEBOUNCE_MS,
  SAVE_ACK_TIMEOUT_MS,
} from "@/lib/collaboration";
import type { SaveState } from "@/lib/types";
import { applyRemoteScene, type ExcalidrawApi } from "@/lib/excalidraw";
import type { SceneSync } from "@/lib/scene-sync";
import { deriveSaveLabel, deriveSaveColor } from "@/lib/save-state";
import { diagramsApi } from "@/api/diagrams";

type LatestScene = { elements: readonly unknown[]; appState: Record<string, unknown> };

type SaveAck = { ok: boolean; reason?: string };

export interface UseSaveManagerParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  diagramId: string;
  activeSceneIdRef: React.MutableRefObject<string | null>;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  sync: SceneSync;
  followingUserIdRef: React.MutableRefObject<string | null>;
  followedViewportRef: React.MutableRefObject<{
    scrollX: number;
    scrollY: number;
    zoom: number;
  } | null>;
  canEdit: boolean;
}

export interface UseSaveManagerReturn {
  saveState: SaveState;
  saveLabel: string;
  saveColor: string;
  lastSavedAt: string | null;
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  flushSave: () => Promise<boolean>;
  cancelPendingTimers: () => void;
}

export function useSaveManager({
  socketRef,
  socketGeneration,
  diagramId,
  activeSceneIdRef,
  excalidrawApiRef,
  sync,
  followingUserIdRef,
  followedViewportRef,
  canEdit,
}: UseSaveManagerParams): UseSaveManagerReturn {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTime = useRef(0);
  const lastViewportEmitTime = useRef(0);
  const lastSavedAt = useRef<string | null>(null);
  // The elements array Excalidraw last handed to onChange; its elements are the live ones.
  const latestRef = useRef<LatestScene | null>(null);

  const cacheKey = `drawhaus_scene_${diagramId}`;

  /* ─── cleanup timers on unmount ─── */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
    };
  }, []);

  /* ─── thumbnail generation ─── */
  const generateThumbnail = useCallback(async (): Promise<void> => {
    const apiRef = excalidrawApiRef.current;
    if (!apiRef) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const els = apiRef.getSceneElements() as Parameters<typeof exportToBlob>[0]["elements"];
      if (els.length === 0) return;
      const blob = await exportToBlob({
        elements: els,
        appState: { ...apiRef.getAppState(), exportWithDarkMode: false } as Parameters<
          typeof exportToBlob
        >[0]["appState"],
        files: apiRef.getFiles() as Parameters<typeof exportToBlob>[0]["files"],
        maxWidthOrHeight: 300,
      });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      await diagramsApi.updateThumbnail(diagramId, dataUrl);
    } catch {
      /* thumbnail is best-effort */
    }
  }, [diagramId]);

  /* ─── persist scene ─── */
  const persistScene = useCallback(
    async (
      elements: unknown[],
      appState: Record<string, unknown>,
      forSceneId: string | null,
    ): Promise<boolean> => {
      if (forSceneId && forSceneId !== activeSceneIdRef.current) return false;
      setSaveState("saving");
      sync.markSaved();
      try {
        const {
          collaborators: _1,
          viewBackgroundColor: _2,
          gridModeEnabled: _3,
          gridSize: _4,
          objectsSnapModeEnabled: _5,
          ...restAppState
        } = appState;
        const sanitizedAppState = jsonSafe(restAppState);
        const safeElements = jsonSafe(elements);
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ elements: safeElements, appState: sanitizedAppState }),
          );
        } catch {
          /* quota exceeded */
        }
        const socket = socketRef.current;
        if (socket?.connected) {
          const acknowledged = new Promise<boolean>((resolve) => {
            socket.timeout(SAVE_ACK_TIMEOUT_MS).emit(
              "save-scene",
              {
                roomId: diagramId,
                sceneId: activeSceneIdRef.current,
                elements: safeElements,
                appState: sanitizedAppState,
                revision: sync.revision,
              },
              (timedOut: unknown, response?: SaveAck) =>
                resolve(!timedOut && response?.ok === true),
            );
          });
          generateThumbnail();
          if (!(await acknowledged)) {
            setSaveState("error");
            return false;
          }
          lastSavedAt.current = new Date().toLocaleTimeString();
          setSaveState("saved");
          return true;
        }
        await diagramsApi.update(diagramId, {
          elements: safeElements,
          appState: sanitizedAppState,
        });
        // That PATCH replaced the scene under a revision only the server knows now.
        sync.forgetRevision();
        lastSavedAt.current = new Date().toLocaleTimeString();
        setSaveState("saved");
        generateThumbnail();
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [diagramId, cacheKey, generateThumbnail],
  );

  /* ─── listen for scene-saved from server ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = () => {
      lastSavedAt.current = new Date().toLocaleTimeString();
      setSaveState("saved");
    };
    socket.on("scene-saved", handler);
    return () => {
      socket.off("scene-saved", handler);
    };
  }, [socketGeneration]);

  /* ─── send the room what changed here since the last broadcast ─── */
  const broadcast = useCallback(() => {
    const scene = latestRef.current;
    if (!scene) return;
    const sharedBefore = sync.sharedCount;
    const { changed, removedIds } = sync.takeChanges(scene.elements);
    if (changed.length === 0 && removedIds.length === 0) return;
    lastEmitTime.current = Date.now();
    const target = {
      roomId: diagramId,
      sceneId: activeSceneIdRef.current,
      revision: sync.revision,
    };
    // If delta covers >50% of the scene, send full state as fallback
    if (removedIds.length > Math.max(sharedBefore, 1) * 0.5) {
      socketRef.current?.emit("scene-update", {
        ...target,
        elements: jsonSafe([...scene.elements]),
      });
    } else {
      socketRef.current?.emit("scene-delta", {
        ...target,
        changed: jsonSafe(changed),
        removedIds,
      });
    }
  }, [diagramId]);

  const flushBroadcast = useCallback(() => {
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current);
      throttleTimer.current = null;
    }
    broadcast();
  }, [broadcast]);

  const throttledBroadcast = useCallback(() => {
    const throttleMs = getAdaptiveThrottleMs(latestRef.current?.elements.length ?? 0);
    const elapsed = Date.now() - lastEmitTime.current;
    if (elapsed >= throttleMs) {
      broadcast();
    } else if (!throttleTimer.current) {
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
        broadcast();
      }, throttleMs - elapsed);
    }
  }, [broadcast]);

  const scheduleSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const capturedSceneId = activeSceneIdRef.current;
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      flushBroadcast();
      const scene = latestRef.current;
      if (!scene || !sync.hasUnsaved()) return;
      persistScene([...scene.elements], scene.appState, capturedSceneId);
    }, SAVE_DEBOUNCE_MS);
  }, [flushBroadcast, persistScene]);

  /* ─── while following, hold the viewport on the followed user's ─── */
  const snapToFollowedViewport = useCallback((appState: Record<string, unknown>) => {
    const fv = followedViewportRef.current;
    const api = excalidrawApiRef.current;
    if (!fv || !api) return;
    const zoom = (appState.zoom as { value: number })?.value ?? 1;
    if (appState.scrollX === fv.scrollX && appState.scrollY === fv.scrollY && zoom === fv.zoom) {
      return;
    }
    applyRemoteScene(api, {
      appState: { scrollX: fv.scrollX, scrollY: fv.scrollY, zoom: { value: fv.zoom } },
    });
  }, []);

  const emitViewport = useCallback(
    (appState: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastViewportEmitTime.current < VIEWPORT_THROTTLE_MS) return;
      lastViewportEmitTime.current = now;
      socketRef.current?.emit("viewport-update", {
        roomId: diagramId,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: (appState.zoom as { value: number })?.value ?? 1,
      });
    },
    [diagramId],
  );

  /* ─── onChange handler ─── */
  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      latestRef.current = { elements, appState };
      if (followingUserIdRef.current) {
        snapToFollowedViewport(appState);
        return; // Skip editing while following
      }
      emitViewport(appState);
      if (!canEdit || !sync.hasChanges(elements)) return;
      setSaveState("pending");
      throttledBroadcast();
      scheduleSave();
    },
    [canEdit, snapToFollowedViewport, emitViewport, throttledBroadcast, scheduleSave],
  );

  /* ─── cancel pending timers (used by scene manager) ─── */
  const cancelPendingTimers = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current);
      throttleTimer.current = null;
    }
  }, []);

  /* ─── flush save ─── */
  const flushSave = useCallback(async (): Promise<boolean> => {
    const api = excalidrawApiRef.current;
    if (!api || !canEdit) return true;
    // Deleted elements too: the tombstone is what outranks older copies on the server.
    const scene = { elements: api.getSceneElementsIncludingDeleted(), appState: api.getAppState() };
    latestRef.current = scene;
    flushBroadcast();
    return persistScene([...scene.elements], scene.appState, activeSceneIdRef.current);
  }, [canEdit, flushBroadcast, persistScene]);

  /* ─── derived values ─── */
  const saveLabel = deriveSaveLabel(saveState, lastSavedAt.current);
  const saveColor = deriveSaveColor(saveState);

  return {
    saveState,
    saveLabel,
    saveColor,
    lastSavedAt: lastSavedAt.current,
    onChange,
    flushSave,
    cancelPendingTimers,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { jsonSafe, getAdaptiveThrottleMs, VIEWPORT_THROTTLE_MS, SAVE_DEBOUNCE_MS } from "@/lib/collaboration";
import type { SaveState, ExcalidrawApi } from "@/lib/types";
import { diagramsApi } from "@/api/diagrams";

export interface UseSaveManagerParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  diagramId: string;
  activeSceneIdRef: React.MutableRefObject<string | null>;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  applyingRemoteCounter: React.MutableRefObject<number>;
  followingUserIdRef: React.MutableRefObject<string | null>;
  followedViewportRef: React.MutableRefObject<{ scrollX: number; scrollY: number; zoom: number } | null>;
  canEdit: boolean;
  hasEditLockRef: React.MutableRefObject<boolean>;
}

export interface UseSaveManagerReturn {
  saveState: SaveState;
  saveLabel: string;
  saveColor: string;
  lastSavedAt: string | null;
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  flushSave: () => Promise<void>;
  cancelPendingTimers: () => void;
}

export function useSaveManager({
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
}: UseSaveManagerParams): UseSaveManagerReturn {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTime = useRef(0);
  const lastViewportEmitTime = useRef(0);
  const lastSavedAt = useRef<string | null>(null);

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
        appState: { ...apiRef.getAppState(), exportWithDarkMode: false } as Parameters<typeof exportToBlob>[0]["appState"],
        files: apiRef.getFiles() as Parameters<typeof exportToBlob>[0]["files"],
        maxWidthOrHeight: 300,
      });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      await diagramsApi.updateThumbnail(diagramId, dataUrl);
    } catch { /* thumbnail is best-effort */ }
  }, [diagramId]);

  /* ─── persist scene ─── */
  const persistScene = useCallback(
    async (elements: unknown[], appState: Record<string, unknown>, forSceneId: string | null) => {
      if (forSceneId && forSceneId !== activeSceneIdRef.current) return;
      setSaveState("saving");
      try {
        const { collaborators: _c, viewBackgroundColor: _bg, gridModeEnabled: _gm, gridSize: _gs, objectsSnapModeEnabled: _os, ...restAppState } = appState;
        const sanitizedAppState = jsonSafe(restAppState);
        const safeElements = jsonSafe(elements);
        try { localStorage.setItem(cacheKey, JSON.stringify({ elements: safeElements, appState: sanitizedAppState })); } catch { /* quota exceeded */ }
        if (socketRef.current?.connected) {
          socketRef.current.emit("save-scene", { roomId: diagramId, sceneId: activeSceneIdRef.current, elements: safeElements, appState: sanitizedAppState });
          generateThumbnail();
          return;
        }
        await diagramsApi.update(diagramId, { elements: safeElements, appState: sanitizedAppState });
        lastSavedAt.current = new Date().toLocaleTimeString();
        setSaveState("saved");
        generateThumbnail();
      } catch { setSaveState("error"); }
    },
    [diagramId, cacheKey, generateThumbnail],
  );

  /* ─── listen for scene-saved from server ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = () => { lastSavedAt.current = new Date().toLocaleTimeString(); setSaveState("saved"); };
    socket.on("scene-saved", handler);
    return () => { socket.off("scene-saved", handler); };
  }, [socketGeneration]);

  /* ─── onChange handler ─── */
  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      if (applyingRemoteCounter.current > 0) return;
      const now = Date.now();
      if (!followingUserIdRef.current) {
        if (now - lastViewportEmitTime.current >= VIEWPORT_THROTTLE_MS) {
          lastViewportEmitTime.current = now;
          const zoom = (appState.zoom as { value: number })?.value ?? 1;
          socketRef.current?.emit("viewport-update", { roomId: diagramId, scrollX: appState.scrollX, scrollY: appState.scrollY, zoom });
        }
      } else {
        // Lock viewport while following — restore to followed user's viewport
        const fv = followedViewportRef.current;
        if (fv) {
          const currentZoom = (appState.zoom as { value: number })?.value ?? 1;
          if (appState.scrollX !== fv.scrollX || appState.scrollY !== fv.scrollY || currentZoom !== fv.zoom) {
            applyingRemoteCounter.current += 1;
            excalidrawApiRef.current?.updateScene({ appState: { scrollX: fv.scrollX, scrollY: fv.scrollY, zoom: { value: fv.zoom } } });
            setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
          }
        }
        return; // Skip editing while following
      }
      if (!canEdit) return;
      if (!hasEditLockRef.current) return;
      setSaveState("pending");
      const throttleMs = getAdaptiveThrottleMs(elements.length);
      const elapsed = now - lastEmitTime.current;
      if (elapsed >= throttleMs) {
        lastEmitTime.current = now;
        socketRef.current?.emit("scene-update", { roomId: diagramId, sceneId: activeSceneIdRef.current, elements: [...elements] });
      } else if (!throttleTimer.current) {
        throttleTimer.current = setTimeout(() => {
          throttleTimer.current = null;
          lastEmitTime.current = Date.now();
          socketRef.current?.emit("scene-update", { roomId: diagramId, sceneId: activeSceneIdRef.current, elements: [...(excalidrawApiRef.current?.getSceneElements?.() ?? elements)] });
        }, throttleMs - elapsed);
      }
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      const capturedSceneId = activeSceneIdRef.current;
      debounceTimer.current = setTimeout(() => { persistScene([...elements], appState, capturedSceneId); }, SAVE_DEBOUNCE_MS);
    },
    [diagramId, persistScene, canEdit],
  );

  /* ─── cancel pending timers (used by scene manager) ─── */
  const cancelPendingTimers = useCallback(() => {
    if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; }
    if (throttleTimer.current) { clearTimeout(throttleTimer.current); throttleTimer.current = null; }
  }, []);

  /* ─── flush save ─── */
  const flushSave = useCallback(async () => {
    const a = excalidrawApiRef.current;
    if (!a) return;
    if (!hasEditLockRef.current) return;
    const elements = a.getSceneElements();
    const appState = a.getAppState();
    await persistScene([...elements], appState as Record<string, unknown>, activeSceneIdRef.current);
  }, [persistScene, saveState]);

  /* ─── derived values ─── */
  const saveLabel = { idle: "Ready", pending: "Unsaved", saving: "Saving...", saved: lastSavedAt.current ? `Saved ${lastSavedAt.current}` : "Saved", error: "Error" }[saveState];
  const saveColor = { idle: "bg-white/80 text-black/50", pending: "bg-amber-100 text-amber-700", saving: "bg-blue-100 text-blue-700", saved: "bg-emerald-100 text-emerald-700", error: "bg-red-100 text-red-700" }[saveState];

  return { saveState, saveLabel, saveColor, lastSavedAt: lastSavedAt.current, onChange, flushSave, cancelPendingTimers };
}

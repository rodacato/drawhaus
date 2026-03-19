import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { mergeElements, jsonSafe } from "@/lib/collaboration";
import type { ExcalidrawApi } from "@/lib/types";
import { api } from "@/api/client";
import type { SceneInfo } from "./types";

export interface UseSceneManagerParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  diagramId: string;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  applyingRemoteCounter: React.MutableRefObject<number>;
  activeSceneIdRef: React.MutableRefObject<string | null>;
  pendingSceneRef: React.MutableRefObject<{ elements: unknown[] } | null>;
  cancelPendingTimers: () => void;
}

export interface UseSceneManagerReturn {
  scenes: SceneInfo[];
  activeSceneId: string | null;
  switchingScene: boolean;
  switchScene: (sceneId: string) => void;
  createScene: (name?: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  renameScene: (sceneId: string, name: string) => Promise<void>;
}

export function useSceneManager({
  socketRef,
  socketGeneration,
  diagramId,
  excalidrawApiRef,
  applyingRemoteCounter,
  activeSceneIdRef,
  pendingSceneRef,
  cancelPendingTimers,
}: UseSceneManagerParams): UseSceneManagerReturn {
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [switchingScene, setSwitchingScene] = useState(false);

  /* ─── sync activeSceneIdRef ─── */
  useEffect(() => { activeSceneIdRef.current = activeSceneId; }, [activeSceneId]);

  /* ─── socket event listeners for scene data ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleSceneFromDb = ({ elements, scenes: scenesList, activeSceneId: sceneId }: { elements: unknown[]; scenes?: SceneInfo[]; activeSceneId?: string | null }) => {
      if (scenesList) setScenes(scenesList);
      if (sceneId) setActiveSceneId(sceneId);
      if (!excalidrawApiRef.current) { pendingSceneRef.current = { elements }; return; }
      // Always apply server data — it's the source of truth on join
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current.updateScene({ elements });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    };

    const handleSceneUpdated = ({ fromSocketId, elements: remoteElements }: { fromSocketId: string; elements: unknown[] }) => {
      if (fromSocketId === socket.id) return;
      const localElements = excalidrawApiRef.current?.getSceneElements?.() ?? [];
      const merged = mergeElements(localElements, remoteElements);
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: merged });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    };

    socket.on("scene-from-db", handleSceneFromDb);
    socket.on("scene-updated", handleSceneUpdated);

    return () => {
      socket.off("scene-from-db", handleSceneFromDb);
      socket.off("scene-updated", handleSceneUpdated);
    };
  }, [socketGeneration]);

  /* ─── scene operations ─── */
  const switchScene = useCallback(async (sceneId: string) => {
    if (sceneId === activeSceneIdRef.current) return;
    cancelPendingTimers();
    const currentSceneId = activeSceneIdRef.current;
    if (currentSceneId && excalidrawApiRef.current && socketRef.current?.connected) {
      const currentElements = excalidrawApiRef.current.getSceneElements?.() ?? [];
      const currentAppState = excalidrawApiRef.current.getAppState?.() ?? {};
      const { collaborators: _c, viewBackgroundColor: _bg, gridModeEnabled: _gm, gridSize: _gs, objectsSnapModeEnabled: _os, ...restAppState } = currentAppState;
      const sanitizedAppState = jsonSafe(restAppState);
      socketRef.current.emit("save-scene", { roomId: diagramId, sceneId: currentSceneId, elements: jsonSafe([...currentElements]), appState: sanitizedAppState });
    }
    socketRef.current?.emit("switch-scene", { roomId: diagramId, sceneId });
    setActiveSceneId(sceneId);
    setSwitchingScene(true);
    try {
      const data = await api.get(`/api/diagrams/${diagramId}/scenes/${sceneId}`) as any;
      const scene = data.scene as { elements: unknown[]; appState: Record<string, unknown> };
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: scene.elements ?? [] });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    } catch { /* ignore */ } finally { setSwitchingScene(false); }
  }, [diagramId, cancelPendingTimers]);

  const createScene = useCallback(async (name?: string) => {
    try {
      const data = await api.post(`/api/diagrams/${diagramId}/scenes`, { name }) as any;
      const newScene = data.scene as SceneInfo;
      setScenes((prev) => [...prev, newScene]);
      switchScene(newScene.id);
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: [] });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    } catch { /* ignore */ }
  }, [diagramId, switchScene]);

  const deleteScene = useCallback(async (sceneId: string) => {
    try {
      await api.delete(`/api/diagrams/${diagramId}/scenes/${sceneId}`);
      setScenes((prev) => {
        const updated = prev.filter((s) => s.id !== sceneId);
        if (activeSceneIdRef.current === sceneId && updated.length > 0) switchScene(updated[0].id);
        return updated;
      });
    } catch { /* ignore */ }
  }, [diagramId, switchScene]);

  const renameScene = useCallback(async (sceneId: string, name: string) => {
    try {
      await api.patch(`/api/diagrams/${diagramId}/scenes/${sceneId}`, { name });
      setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, name } : s));
    } catch { /* ignore */ }
  }, [diagramId]);

  return { scenes, activeSceneId, switchingScene, switchScene, createScene, deleteScene, renameScene };
}

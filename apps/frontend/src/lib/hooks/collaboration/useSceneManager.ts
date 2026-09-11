import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { mergeElements, mergeDelta } from "@/lib/collaboration";
import { applyRemoteScene, type ExcalidrawApi } from "@/lib/excalidraw";

// Lazy-loaded restoreElements to normalise raw DB elements that may be
// missing Excalidraw-internal fields (seed, version, opacity, …).
let _restoreElements: ((elements: unknown[], localElements: null) => unknown[]) | null = null;
const getRestoreElements = async () => {
  if (!_restoreElements) {
    const mod = await import("@excalidraw/excalidraw");
    _restoreElements = (mod as unknown as { restoreElements: typeof _restoreElements })
      .restoreElements!;
  }
  return _restoreElements;
};

export interface UseSceneManagerParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  applyingRemoteCounter: React.MutableRefObject<number>;
  activeSceneIdRef: React.MutableRefObject<string | null>;
  pendingSceneRef: React.MutableRefObject<{ elements: unknown[] } | null>;
  onConflict?: (conflictIds: string[], fromUserId: string) => void;
  onRemoteDelete?: (deletedIds: string[], fromUserId: string) => void;
}

export interface UseSceneManagerReturn {
  activeSceneId: string | null;
}

export function useSceneManager({
  socketRef,
  socketGeneration,
  excalidrawApiRef,
  applyingRemoteCounter,
  activeSceneIdRef,
  pendingSceneRef,
  onConflict,
  onRemoteDelete,
}: UseSceneManagerParams): UseSceneManagerReturn {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  /* ─── sync activeSceneIdRef ─── */
  useEffect(() => {
    activeSceneIdRef.current = activeSceneId;
  }, [activeSceneId]);

  /* ─── socket event listeners for scene data ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const applyRemote = (api: ExcalidrawApi, elements: unknown[]) => {
      applyingRemoteCounter.current += 1;
      applyRemoteScene(api, { elements });
      setTimeout(() => {
        applyingRemoteCounter.current -= 1;
      }, 0);
    };

    const handleSceneFromDb = ({
      elements,
      activeSceneId: sceneId,
    }: {
      elements: unknown[];
      activeSceneId?: string | null;
    }) => {
      if (sceneId) setActiveSceneId(sceneId);

      // Normalise elements — DB rows may lack Excalidraw-internal fields
      // (seed, version, opacity …) which causes updateScene to render blanks.
      const apply = (els: unknown[]) => {
        const api = excalidrawApiRef.current;
        if (!api) {
          pendingSceneRef.current = { elements: els };
          return;
        }
        applyRemote(api, els);
      };

      getRestoreElements()
        .then((restore) => apply(restore(elements, null)))
        .catch(() => apply(elements)); // fallback: apply raw if import fails
    };

    const handleSceneUpdated = ({
      fromSocketId,
      elements: remoteElements,
    }: {
      fromSocketId: string;
      elements: unknown[];
    }) => {
      const api = excalidrawApiRef.current;
      if (fromSocketId === socket.id || !api) return;
      applyRemote(api, mergeElements(api.getSceneElements(), remoteElements));
    };

    const handleSceneDeltaReceived = ({
      fromSocketId,
      fromUserId,
      changed,
      removedIds,
    }: {
      fromSocketId: string;
      fromUserId: string;
      changed: unknown[];
      removedIds: string[];
    }) => {
      const api = excalidrawApiRef.current;
      if (fromSocketId === socket.id || !api) return;
      const {
        elements: merged,
        conflictIds,
        deletedIds,
      } = mergeDelta(api.getSceneElements(), changed, removedIds);
      applyRemote(api, merged);
      if (conflictIds.length > 0) onConflict?.(conflictIds, fromUserId);
      if (deletedIds.length > 0) onRemoteDelete?.(deletedIds, fromUserId);
    };

    socket.on("scene-from-db", handleSceneFromDb);
    socket.on("scene-updated", handleSceneUpdated);
    socket.on("scene-delta-received", handleSceneDeltaReceived);

    return () => {
      socket.off("scene-from-db", handleSceneFromDb);
      socket.off("scene-updated", handleSceneUpdated);
      socket.off("scene-delta-received", handleSceneDeltaReceived);
    };
  }, [socketGeneration]);

  return { activeSceneId };
}

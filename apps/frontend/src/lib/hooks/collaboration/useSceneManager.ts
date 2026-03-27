import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { mergeElements, mergeDelta } from "@/lib/collaboration";
import type { ExcalidrawApi } from "@/lib/types";

// Lazy-loaded restoreElements to normalise raw DB elements that may be
// missing Excalidraw-internal fields (seed, version, opacity, …).
let _restoreElements: ((elements: unknown[], localElements: null) => unknown[]) | null = null;
const getRestoreElements = async () => {
  if (!_restoreElements) {
    const mod = await import("@excalidraw/excalidraw");
    _restoreElements = (mod as unknown as { restoreElements: typeof _restoreElements }).restoreElements!;
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
  useEffect(() => { activeSceneIdRef.current = activeSceneId; }, [activeSceneId]);

  /* ─── socket event listeners for scene data ─── */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleSceneFromDb = ({ elements, activeSceneId: sceneId }: { elements: unknown[]; activeSceneId?: string | null }) => {
      if (sceneId) setActiveSceneId(sceneId);

      // Normalise elements — DB rows may lack Excalidraw-internal fields
      // (seed, version, opacity …) which causes updateScene to render blanks.
      const apply = (els: unknown[]) => {
        if (!excalidrawApiRef.current) { pendingSceneRef.current = { elements: els }; return; }
        applyingRemoteCounter.current += 1;
        excalidrawApiRef.current.updateScene({ elements: els });
        setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
      };

      getRestoreElements()
        .then((restore) => apply(restore(elements, null)))
        .catch(() => apply(elements)); // fallback: apply raw if import fails
    };

    const handleSceneUpdated = ({ fromSocketId, elements: remoteElements }: { fromSocketId: string; elements: unknown[] }) => {
      if (fromSocketId === socket.id) return;
      const localElements = excalidrawApiRef.current?.getSceneElements?.() ?? [];
      const merged = mergeElements(localElements, remoteElements);
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: merged });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
    };

    const handleSceneDeltaReceived = ({ fromSocketId, fromUserId, changed, removedIds }: { fromSocketId: string; fromUserId: string; changed: unknown[]; removedIds: string[] }) => {
      if (fromSocketId === socket.id) return;
      const localElements = excalidrawApiRef.current?.getSceneElements?.() ?? [];
      const { elements: merged, conflictIds, deletedIds } = mergeDelta(localElements, changed, removedIds);
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: merged });
      setTimeout(() => { applyingRemoteCounter.current -= 1; }, 0);
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

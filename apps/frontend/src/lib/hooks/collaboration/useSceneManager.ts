import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { mergeElements } from "@/lib/collaboration";
import type { ExcalidrawApi } from "@/lib/types";

export interface UseSceneManagerParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  applyingRemoteCounter: React.MutableRefObject<number>;
  activeSceneIdRef: React.MutableRefObject<string | null>;
  pendingSceneRef: React.MutableRefObject<{ elements: unknown[] } | null>;
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
      if (!excalidrawApiRef.current) { pendingSceneRef.current = { elements }; return; }
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

  return { activeSceneId };
}

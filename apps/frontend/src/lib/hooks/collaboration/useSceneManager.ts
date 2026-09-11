import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { mergeElements, mergeDelta } from "@/lib/collaboration";
import { applyRemoteScene, type ExcalidrawApi } from "@/lib/excalidraw";
import type { SceneSync } from "@/lib/scene-sync";

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

type Revision = number | null | undefined;

export interface UseSceneManagerParams {
  socketRef: React.MutableRefObject<Socket | null>;
  socketGeneration: number;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  sync: SceneSync;
  activeSceneIdRef: React.MutableRefObject<string | null>;
  pendingSceneRef: React.MutableRefObject<{ elements: unknown[] } | null>;
  onConflict?: (conflictIds: string[], fromUserId: string) => void;
  onRemoteDelete?: (deletedIds: string[], fromUserId: string) => void;
}

export interface UseSceneManagerReturn {
  activeSceneId: string | null;
}

/** The copies a merge took from the room rather than kept from the local scene. */
function takenFrom(merged: unknown[], incoming: readonly unknown[]): unknown[] {
  const remote = new Set(incoming);
  return merged.filter((el) => remote.has(el));
}

export function useSceneManager({
  socketRef,
  socketGeneration,
  excalidrawApiRef,
  sync,
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

    const handleSceneFromDb = ({
      elements,
      activeSceneId: sceneId,
      revision,
    }: {
      elements: unknown[];
      activeSceneId?: string | null;
      revision?: Revision;
    }) => {
      if (sceneId) setActiveSceneId(sceneId);

      const apply = (serverElements: unknown[]) => {
        const api = excalidrawApiRef.current;
        // A replace (restore, API write) wins over edits made before this client saw it; after a
        // plain reconnect, edits the server has not seen stay on top, still pending a save.
        const localEdits = sync.isReplacedBy(revision)
          ? []
          : sync.localEdits(api?.getSceneElementsIncludingDeleted() ?? []);
        sync.reset(serverElements, revision ?? null);
        const scene =
          localEdits.length > 0 ? mergeElements(localEdits, serverElements) : serverElements;
        if (!api) {
          pendingSceneRef.current = { elements: scene };
          return;
        }
        applyRemoteScene(api, { elements: scene });
      };

      // Normalise elements — DB rows may lack Excalidraw-internal fields
      // (seed, version, opacity …) which causes updateScene to render blanks.
      getRestoreElements()
        .then((restore) => apply(restore(elements, null)))
        .catch(() => apply(elements)); // fallback: apply raw if import fails
    };

    const handleSceneUpdated = ({
      fromSocketId,
      elements: remoteElements,
      revision,
    }: {
      fromSocketId: string;
      elements: unknown[];
      revision?: Revision;
    }) => {
      const api = excalidrawApiRef.current;
      if (fromSocketId === socket.id || !api || sync.isStale(revision)) return;
      const merged = mergeElements(api.getSceneElementsIncludingDeleted(), remoteElements);
      applyRemoteScene(api, { elements: merged });
      // Read after applying: Excalidraw may re-index, and so re-version, what it was given.
      sync.markShared(takenFrom(merged, remoteElements));
    };

    const handleSceneDeltaReceived = ({
      fromSocketId,
      fromUserId,
      changed,
      removedIds,
      revision,
    }: {
      fromSocketId: string;
      fromUserId: string;
      changed: unknown[];
      removedIds: string[];
      revision?: Revision;
    }) => {
      const api = excalidrawApiRef.current;
      if (fromSocketId === socket.id || !api || sync.isStale(revision)) return;
      const local = api.getSceneElementsIncludingDeleted();
      const edited = sync.editedIds(local);
      const { elements, conflictIds, deletedIds } = mergeDelta(local, changed, removedIds, edited);
      applyRemoteScene(api, { elements });
      sync.markShared(takenFrom(elements, changed));
      sync.forget(deletedIds);
      if (conflictIds.length > 0) onConflict?.(conflictIds, fromUserId);
      const deletedWhileEdited = deletedIds.filter((id) => edited.has(id));
      if (deletedWhileEdited.length > 0) onRemoteDelete?.(deletedWhileEdited, fromUserId);
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

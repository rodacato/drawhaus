import { useMemo, useRef } from "react";
import { useToast } from "@/components/Toast";
import type {
  ConflictCallback,
  EditsReplacedCallback,
  RemoteDeleteCallback,
} from "./collaboration/types";

export type CollaborationView = {
  readonly presenceUsers: ReadonlyArray<{ readonly userId: string; readonly name: string }>;
  readonly canEdit: boolean;
};

export type CollaborationFeedback = {
  readonly onConflict: ConflictCallback;
  readonly onRemoteDelete: RemoteDeleteCallback;
  readonly onEditsReplaced: EditsReplacedCallback;
};

function describeTarget(ids: readonly string[]): string {
  return ids.length === 1 ? "un elemento" : `${ids.length} elementos`;
}

// Stable callbacks: useSceneManager keeps the ones it saw when the socket was created.
export function useCollaborationFeedback(): {
  readonly callbacks: CollaborationFeedback;
  readonly collabRef: React.MutableRefObject<CollaborationView>;
} {
  const toast = useToast();
  const collabRef = useRef<CollaborationView>({ presenceUsers: [], canEdit: false });

  const callbacks = useMemo<CollaborationFeedback>(() => {
    const nameOf = (userId: string) =>
      collabRef.current.presenceUsers.find((u) => u.userId === userId)?.name ?? "Otro usuario";
    // Excalidraw re-versions elements it re-indexes, which reads as a local edit on a canvas that
    // never saves; a read-only user has nothing to lose, so they hear nothing.
    const canEdit = () => collabRef.current.canEdit;

    return {
      onConflict: (conflictIds, fromUserId) => {
        if (!canEdit()) return;
        toast(`${nameOf(fromUserId)} modificó ${describeTarget(conflictIds)} que editabas`, "info");
      },
      onRemoteDelete: (deletedIds, fromUserId) => {
        if (!canEdit()) return;
        toast(`${nameOf(fromUserId)} eliminó ${describeTarget(deletedIds)} que editabas`, "info");
      },
      onEditsReplaced: (discardedIds) => {
        if (!canEdit()) return;
        toast(
          `El diagrama fue reemplazado; se descartaron tus cambios en ${describeTarget(discardedIds)}`,
          "error",
        );
      },
    };
  }, [toast]);

  return { callbacks, collabRef };
}

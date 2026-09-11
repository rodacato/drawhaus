import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { diagramsApi } from "@/api/diagrams";
import { useAuth } from "@/contexts/AuthContext";
import BoardEditor from "@/components/BoardEditor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BoardErrorFallback } from "@/components/BoardErrorFallback";

type DiagramData = {
  id: string;
  title: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  workspaceId: string | null;
  createdVia?: string;
};

// Tagged with the requested id so a result for the previous board is never shown for the next.
type LoadResult = { id: string; diagram: DiagramData } | { id: string; error: string };

export function Board() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (!id) return;
    let current = true;
    diagramsApi
      .get(id)
      .then((data) => {
        if (!current) return;
        const d = data.diagram ?? data;
        setLoaded({
          id,
          diagram: {
            id: d.id,
            title: d.title ?? "",
            elements: d.elements ?? [],
            appState: d.appState ?? d.app_state ?? {},
            workspaceId: d.workspaceId ?? d.workspace_id ?? null,
            createdVia: d.createdVia ?? d.created_via,
          },
        });
      })
      .catch(() => {
        if (current) setLoaded({ id, error: "Diagram not found" });
      });
    return () => {
      current = false;
    };
  }, [id]);

  if (!loaded || loaded.id !== id) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-text-muted">
        Loading...
      </div>
    );
  }

  if ("error" in loaded) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-red-600">
        {loaded.error}
      </div>
    );
  }

  const { diagram } = loaded;
  return (
    <ErrorBoundary FallbackComponent={BoardErrorFallback}>
      {/* Collab hooks hold per-diagram refs (active scene, socket listeners): remount per board. */}
      <BoardEditor
        key={diagram.id}
        diagramId={diagram.id}
        title={diagram.title}
        userEmail={user?.email ?? ""}
        initialElements={diagram.elements}
        initialAppState={diagram.appState}
        workspaceId={diagram.workspaceId}
        createdVia={diagram.createdVia}
      />
    </ErrorBoundary>
  );
}

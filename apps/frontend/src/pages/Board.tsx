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

export function Board() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [diagram, setDiagram] = useState<DiagramData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    diagramsApi.get(id).then((data) => {
      const d = data.diagram ?? data;
      setDiagram({
        id: d.id,
        title: d.title ?? "",
        elements: d.elements ?? [],
        appState: d.appState ?? d.app_state ?? {},
        workspaceId: d.workspaceId ?? d.workspace_id ?? null,
        createdVia: d.createdVia ?? d.created_via,
      });
    }).catch(() => setError("Diagram not found"));
  }, [id]);

  if (error) {
    return <div className="flex h-screen items-center justify-center text-sm text-red-600">{error}</div>;
  }

  if (!diagram) {
    return <div className="flex h-screen items-center justify-center text-sm text-text-muted">Loading...</div>;
  }

  return (
    <ErrorBoundary FallbackComponent={BoardErrorFallback}>
      <BoardEditor
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

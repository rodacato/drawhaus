import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import BoardEditor from "./BoardEditor";
import { getBackendUrl } from "@/lib/backend";
import { getCurrentUser } from "@/lib/auth";

type DiagramPayload = {
  diagram: {
    id: string;
    title: string;
    elements?: unknown[];
    appState?: Record<string, unknown>;
  };
};

async function getDiagram(id: string): Promise<DiagramPayload["diagram"] | null> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${getBackendUrl()}/api/diagrams/${id}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DiagramPayload;
  return payload.diagram;
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const diagram = await getDiagram(id);

  if (!diagram) {
    notFound();
  }

  return (
    <BoardEditor
      diagramId={diagram.id}
      title={diagram.title}
      userEmail={user?.email ?? ""}
      initialElements={diagram.elements ?? []}
      initialAppState={diagram.appState ?? {}}
    />
  );
}

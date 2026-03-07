import { notFound } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";
import ShareView from "./ShareView";

type SharePayload = {
  share: {
    token: string;
    role: "editor" | "viewer";
    expiresAt: string | null;
  };
  diagram: {
    id: string;
    title: string;
    elements: unknown[];
    appState: Record<string, unknown>;
  };
};

async function getShareData(token: string): Promise<SharePayload | null> {
  const response = await fetch(`${getBackendUrl()}/api/share/link/${token}`, {
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as SharePayload;
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getShareData(token);

  if (!data) {
    notFound();
  }

  return (
    <ShareView
      shareToken={token}
      diagramId={data.diagram.id}
      title={data.diagram.title}
      role={data.share.role}
      initialElements={data.diagram.elements ?? []}
      initialAppState={data.diagram.appState ?? {}}
    />
  );
}

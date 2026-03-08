import { notFound } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";
import EmbedView from "./EmbedView";

type SharePayload = {
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

export default async function EmbedPage({
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
    <EmbedView
      elements={data.diagram.elements ?? []}
      appState={data.diagram.appState ?? {}}
    />
  );
}

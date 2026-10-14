import { shareApi } from "@/api/share";
import { isExpired } from "@/lib/format-utils";

type ShareLinkSummary = { token: string; role: string; expiresAt?: string | null };

export function shareUrlFor(token: string): string {
  return `${globalThis.location.origin}/share/${token}`;
}

export async function findOrCreateShareUrl(
  diagramId: string,
  role: "viewer" | "editor",
): Promise<string> {
  const { links } = (await shareApi.list(diagramId)) as { links?: ShareLinkSummary[] };
  const live = links?.find((link) => link.role === role && !isExpired(link.expiresAt));
  if (live) return shareUrlFor(live.token);

  const created = await shareApi.create(diagramId, role);
  const token = created.shareLink?.token;
  if (!token) throw new Error("The server returned no share token");
  return shareUrlFor(token);
}

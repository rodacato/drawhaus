export type ShareLink = {
  token: string;
  diagramId: string;
  createdBy: string;
  role: "editor" | "viewer";
  expiresAt: Date | null;
  createdAt: Date;
};

export function isShareLinkExpired(link: ShareLink): boolean {
  return link.expiresAt !== null && link.expiresAt.getTime() <= Date.now();
}

export type Diagram = {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  title: string;
  folderId: string | null;
  elements: unknown[];
  appState: Record<string, unknown>;
  thumbnail: string | null;
  starred: boolean;
  createdVia: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DiagramRole = "owner" | "editor" | "viewer";

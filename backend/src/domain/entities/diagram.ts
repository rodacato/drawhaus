export type Diagram = {
  id: string;
  ownerId: string;
  title: string;
  folderId: string | null;
  elements: unknown[];
  appState: Record<string, unknown>;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DiagramRole = "owner" | "editor" | "viewer";

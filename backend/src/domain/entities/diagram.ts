export type Diagram = {
  id: string;
  ownerId: string;
  title: string;
  folderId: string | null;
  elements: unknown[];
  appState: Record<string, unknown>;
  thumbnail: string | null;
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DiagramRole = "owner" | "editor" | "viewer";

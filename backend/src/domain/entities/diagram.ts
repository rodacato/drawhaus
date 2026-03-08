export type Diagram = {
  id: string;
  ownerId: string;
  title: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type DiagramRole = "owner" | "editor" | "viewer";

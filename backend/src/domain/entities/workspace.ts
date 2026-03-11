export type Workspace = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  isPersonal: boolean;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceRole = "admin" | "editor" | "viewer";

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  addedAt: Date;
};

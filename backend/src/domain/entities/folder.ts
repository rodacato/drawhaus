export type Folder = {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  name: string;
  createdAt: Date;
};

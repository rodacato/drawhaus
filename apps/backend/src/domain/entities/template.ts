export type Template = {
  id: string;
  creatorId: string;
  workspaceId: string | null;
  title: string;
  description: string;
  category: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  thumbnail: string | null;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

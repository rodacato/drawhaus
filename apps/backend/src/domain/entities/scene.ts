export type Scene = {
  id: string;
  diagramId: string;
  name: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

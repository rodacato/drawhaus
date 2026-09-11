export type Scene = {
  id: string;
  diagramId: string;
  name: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  sortOrder: number;
  /** Bumped by every write that replaces the content, never by a merged save (ADR-026). */
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

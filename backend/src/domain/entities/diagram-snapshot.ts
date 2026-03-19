export type SnapshotTrigger = "open" | "close" | "interval" | "manual";

export type DiagramSnapshot = {
  id: string;
  diagramId: string;
  createdBy: string | null;
  createdByName: string | null;
  activeUsers: number;
  contentHash: string | null;
  trigger: SnapshotTrigger;
  name: string | null;
  elements: unknown[];
  appState: Record<string, unknown>;
  createdAt: Date;
};

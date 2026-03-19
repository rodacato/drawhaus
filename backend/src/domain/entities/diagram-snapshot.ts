export type SnapshotTrigger = "open" | "close" | "interval" | "manual";

export type DiagramSnapshot = {
  id: string;
  diagramId: string;
  createdBy: string | null;
  trigger: SnapshotTrigger;
  name: string | null;
  elements: unknown[];
  appState: Record<string, unknown>;
  createdAt: Date;
};

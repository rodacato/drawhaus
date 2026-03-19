import { api } from "./client";

export type SnapshotMeta = {
  id: string;
  diagramId: string;
  createdBy: string | null;
  trigger: "open" | "close" | "interval" | "manual";
  name: string | null;
  createdAt: string;
};

export type SnapshotFull = SnapshotMeta & {
  elements: unknown[];
  appState: Record<string, unknown>;
};

// Note: api interceptor unwraps response.data, so these return the data directly
export const snapshotsApi = {
  list: (diagramId: string) =>
    api.get(`/api/diagrams/${diagramId}/snapshots`) as Promise<{ snapshots: SnapshotMeta[] }>,

  get: (diagramId: string, snapshotId: string) =>
    api.get(`/api/diagrams/${diagramId}/snapshots/${snapshotId}`) as Promise<{ snapshot: SnapshotFull }>,

  create: (diagramId: string, name?: string) =>
    api.post(`/api/diagrams/${diagramId}/snapshots`, { name }) as Promise<{ snapshot: SnapshotMeta }>,

  restore: (diagramId: string, snapshotId: string) =>
    api.post(`/api/diagrams/${diagramId}/snapshots/${snapshotId}/restore`) as Promise<{ success: boolean; diagramId: string }>,

  rename: (diagramId: string, snapshotId: string, name: string | null) =>
    api.patch(`/api/diagrams/${diagramId}/snapshots/${snapshotId}`, { name }) as Promise<{ snapshot: SnapshotMeta }>,

  delete: (diagramId: string, snapshotId: string) =>
    api.delete(`/api/diagrams/${diagramId}/snapshots/${snapshotId}`),
};

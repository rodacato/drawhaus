import type { DiagramSnapshot, SnapshotTrigger } from "../entities/diagram-snapshot";

export interface SnapshotRepository {
  create(data: {
    diagramId: string;
    createdBy: string | null;
    trigger: SnapshotTrigger;
    name?: string | null;
    activeUsers?: number;
    contentHash?: string | null;
    elements: unknown[];
    appState: Record<string, unknown>;
  }): Promise<DiagramSnapshot>;

  findById(id: string): Promise<DiagramSnapshot | null>;

  /** List snapshots for a diagram (metadata only — no elements/appState). */
  listByDiagram(diagramId: string): Promise<DiagramSnapshot[]>;

  rename(id: string, name: string | null): Promise<DiagramSnapshot | null>;

  delete(id: string): Promise<void>;

  /** Get the most recent snapshot for any trigger (cross-trigger dedup). */
  findLatestForDiagram(diagramId: string): Promise<DiagramSnapshot | null>;

  /** Count named snapshots for a diagram. */
  countNamed(diagramId: string): Promise<number>;

  /** Batch count named snapshots for multiple diagrams. */
  countNamedBatch(diagramIds: string[]): Promise<Map<string, number>>;

  /** Purge auto-snapshots beyond retention limits. */
  purgeAuto(diagramId: string, keepCount: number, keepDays: number): Promise<number>;
}

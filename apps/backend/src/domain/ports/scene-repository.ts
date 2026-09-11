import type { Scene } from "../entities/scene";

export type SceneMergeResult = "saved" | "stale" | "missing";

export interface SceneRepository {
  findById(id: string): Promise<Scene | null>;
  findByDiagram(diagramId: string): Promise<Scene[]>;
  create(data: {
    diagramId: string;
    name: string;
    sortOrder: number;
    elements?: unknown[];
    appState?: Record<string, unknown>;
  }): Promise<Scene>;
  rename(id: string, name: string): Promise<Scene | null>;
  /** Replaces the content; returns the scene's new revision, or null when there is no such scene. */
  updateScene(
    id: string,
    elements: unknown[],
    appState: Record<string, unknown>,
  ): Promise<number | null>;
  /**
   * Merges `incomingElements` into the scene. Persists nothing and answers "missing" when no
   * scene with `id` belongs to `diagramId`, or "stale" when `expectedRevision` is given and a
   * replace has since moved the scene past it.
   */
  updateSceneMerged(
    id: string,
    diagramId: string,
    incomingElements: unknown[],
    appState: Record<string, unknown>,
    expectedRevision?: number,
  ): Promise<SceneMergeResult>;
  reorder(id: string, sortOrder: number): Promise<void>;
  delete(id: string): Promise<void>;
}

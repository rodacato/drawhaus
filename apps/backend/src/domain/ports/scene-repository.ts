import type { Scene } from "../entities/scene";

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
  updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void>;
  /** Returns false, persisting nothing, when no scene with `id` belongs to `diagramId`. */
  updateSceneMerged(
    id: string,
    diagramId: string,
    incomingElements: unknown[],
    appState: Record<string, unknown>,
  ): Promise<boolean>;
  reorder(id: string, sortOrder: number): Promise<void>;
  delete(id: string): Promise<void>;
}

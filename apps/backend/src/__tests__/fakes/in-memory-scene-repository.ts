import crypto from "crypto";
import type { SceneRepository } from "../../domain/ports/scene-repository";
import type { Scene } from "../../domain/entities/scene";
import { mergeElements } from "@drawhaus/helpers";

export class InMemorySceneRepository implements SceneRepository {
  store: Scene[] = [];

  async findById(id: string): Promise<Scene | null> {
    return this.store.find((s) => s.id === id) ?? null;
  }

  async findByDiagram(diagramId: string): Promise<Scene[]> {
    return this.store
      .filter((s) => s.diagramId === diagramId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async create(data: {
    diagramId: string;
    name: string;
    sortOrder: number;
    elements?: unknown[];
    appState?: Record<string, unknown>;
  }): Promise<Scene> {
    const scene: Scene = {
      id: crypto.randomUUID(),
      diagramId: data.diagramId,
      name: data.name,
      elements: data.elements ?? [],
      appState: data.appState ?? {},
      sortOrder: data.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(scene);
    return scene;
  }

  async rename(id: string, name: string): Promise<Scene | null> {
    const scene = this.store.find((s) => s.id === id);
    if (!scene) return null;
    scene.name = name;
    return scene;
  }

  async updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void> {
    const scene = this.store.find((s) => s.id === id);
    if (scene) {
      scene.elements = elements;
      scene.appState = appState;
      scene.updatedAt = new Date();
    }
  }

  async updateSceneMerged(id: string, incomingElements: unknown[], appState: Record<string, unknown>): Promise<void> {
    const scene = this.store.find((s) => s.id === id);
    if (scene) {
      scene.elements = mergeElements(scene.elements, incomingElements);
      scene.appState = appState;
      scene.updatedAt = new Date();
    }
  }

  async reorder(id: string, sortOrder: number): Promise<void> {
    const scene = this.store.find((s) => s.id === id);
    if (scene) scene.sortOrder = sortOrder;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((s) => s.id !== id);
  }
}

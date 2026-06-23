import crypto from "crypto";
import type { SnapshotRepository } from "../../domain/ports/snapshot-repository";
import type { DiagramSnapshot, SnapshotTrigger } from "../../domain/entities/diagram-snapshot";

export class InMemorySnapshotRepository implements SnapshotRepository {
  store: DiagramSnapshot[] = [];

  async create(data: {
    diagramId: string;
    createdBy: string | null;
    trigger: SnapshotTrigger;
    name?: string | null;
    activeUsers?: number;
    contentHash?: string | null;
    elements: unknown[];
    appState: Record<string, unknown>;
  }): Promise<DiagramSnapshot> {
    const snapshot: DiagramSnapshot = {
      id: crypto.randomUUID(),
      diagramId: data.diagramId,
      createdBy: data.createdBy,
      createdByName: null,
      activeUsers: data.activeUsers ?? 1,
      contentHash: data.contentHash ?? null,
      trigger: data.trigger,
      name: data.name ?? null,
      elements: data.elements,
      appState: data.appState,
      createdAt: new Date(),
    };
    this.store.push(snapshot);
    return snapshot;
  }

  async findById(id: string): Promise<DiagramSnapshot | null> {
    return this.store.find((s) => s.id === id) ?? null;
  }

  async listByDiagram(diagramId: string): Promise<DiagramSnapshot[]> {
    return this.store
      .filter((s) => s.diagramId === diagramId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => ({ ...s, elements: [], appState: {} }));
  }

  async rename(id: string, name: string | null): Promise<DiagramSnapshot | null> {
    const snapshot = this.store.find((s) => s.id === id);
    if (!snapshot) return null;
    snapshot.name = name;
    return snapshot;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((s) => s.id !== id);
  }

  async findLatestForDiagram(diagramId: string): Promise<DiagramSnapshot | null> {
    const matches = this.store
      .filter((s) => s.diagramId === diagramId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0] ?? null;
  }

  async countNamed(diagramId: string): Promise<number> {
    return this.store.filter((s) => s.diagramId === diagramId && s.name !== null).length;
  }

  async countNamedBatch(diagramIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const id of diagramIds) {
      const count = this.store.filter((s) => s.diagramId === id && s.name !== null).length;
      if (count > 0) map.set(id, count);
    }
    return map;
  }

  async purgeAuto(diagramId: string, keepCount: number, keepDays: number): Promise<number> {
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    const autos = this.store
      .filter((s) => s.diagramId === diagramId && s.name === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const keepIds = new Set(autos.slice(0, keepCount).map((s) => s.id));
    const before = this.store.length;
    this.store = this.store.filter(
      (s) =>
        !(s.diagramId === diagramId && s.name === null && !keepIds.has(s.id) && s.createdAt.getTime() < cutoff),
    );
    return before - this.store.length;
  }
}

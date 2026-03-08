import crypto from "crypto";
import type { DiagramRepository } from "../../domain/ports/diagram-repository";
import type { Diagram, DiagramRole } from "../../domain/entities/diagram";

export class InMemoryDiagramRepository implements DiagramRepository {
  store: Diagram[] = [];
  members: { diagramId: string; userId: string; role: "editor" | "viewer" }[] = [];

  async findById(id: string): Promise<Diagram | null> {
    return this.store.find((d) => d.id === id) ?? null;
  }

  async findByUser(userId: string): Promise<Diagram[]> {
    const memberDiagramIds = new Set(
      this.members.filter((m) => m.userId === userId).map((m) => m.diagramId),
    );
    return this.store.filter((d) => d.ownerId === userId || memberDiagramIds.has(d.id));
  }

  async findAccessRole(diagramId: string, userId: string): Promise<DiagramRole | null> {
    const diagram = this.store.find((d) => d.id === diagramId);
    if (!diagram) return null;
    if (diagram.ownerId === userId) return "owner";
    const member = this.members.find((m) => m.diagramId === diagramId && m.userId === userId);
    return member?.role ?? null;
  }

  async create(data: { title: string; ownerId: string; elements?: unknown[]; appState?: Record<string, unknown> }): Promise<Diagram> {
    const diagram: Diagram = {
      id: crypto.randomUUID(),
      ownerId: data.ownerId,
      title: data.title,
      elements: data.elements ?? [],
      appState: data.appState ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(diagram);
    return diagram;
  }

  async update(id: string, data: Partial<Pick<Diagram, "title" | "elements" | "appState">>): Promise<Diagram | null> {
    const diagram = this.store.find((d) => d.id === id);
    if (!diagram) return null;
    if (data.title !== undefined) diagram.title = data.title;
    if (data.elements !== undefined) diagram.elements = data.elements;
    if (data.appState !== undefined) diagram.appState = data.appState;
    diagram.updatedAt = new Date();
    return diagram;
  }

  async updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void> {
    const diagram = this.store.find((d) => d.id === id);
    if (diagram) {
      diagram.elements = elements;
      diagram.appState = appState;
      diagram.updatedAt = new Date();
    }
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((d) => d.id !== id);
  }
}

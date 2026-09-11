import crypto from "crypto";
import type { DiagramRepository } from "../../domain/ports/diagram-repository";
import type { Diagram, DiagramRole } from "../../domain/entities/diagram";
import type { WorkspaceRole } from "../../domain/entities/workspace";
import { InMemorySceneRepository } from "./in-memory-scene-repository";
import { InMemoryWorkspaceRepository } from "./in-memory-workspace-repository";

export class InMemoryDiagramRepository implements DiagramRepository {
  store: Diagram[] = [];
  members: { diagramId: string; userId: string; role: "editor" | "viewer" }[] = [];

  // Content writes land in the scene store, as in Postgres; share it with readers under test.
  // Workspace members reach the workspace's diagrams, as in Postgres; share that store too.
  constructor(
    readonly scenes: InMemorySceneRepository = new InMemorySceneRepository(),
    readonly workspaces: InMemoryWorkspaceRepository = new InMemoryWorkspaceRepository(),
  ) {}

  private diagramRole(diagramId: string, userId: string): "editor" | "viewer" | null {
    return this.members.find((m) => m.diagramId === diagramId && m.userId === userId)?.role ?? null;
  }

  private workspaceRole(diagram: Diagram, userId: string): WorkspaceRole | null {
    if (!diagram.workspaceId) return null;
    const member = this.workspaces.members.find(
      (m) => m.workspaceId === diagram.workspaceId && m.userId === userId,
    );
    return member?.role ?? null;
  }

  private canSee(diagram: Diagram, userId: string): boolean {
    return (
      diagram.ownerId === userId ||
      this.diagramRole(diagram.id, userId) !== null ||
      this.workspaceRole(diagram, userId) !== null
    );
  }

  async findById(id: string): Promise<Diagram | null> {
    return this.store.find((d) => d.id === id) ?? null;
  }

  async findByUser(
    userId: string,
    folderId?: string | null,
    workspaceId?: string,
  ): Promise<Diagram[]> {
    let results = this.store.filter((d) => this.canSee(d, userId));
    if (workspaceId) {
      results = results.filter((d) => d.workspaceId === workspaceId);
    }
    if (folderId !== undefined) {
      results = results.filter((d) => d.folderId === folderId);
    }
    return results;
  }

  async findAccessRole(diagramId: string, userId: string): Promise<DiagramRole | null> {
    const diagram = this.store.find((d) => d.id === diagramId);
    if (!diagram) return null;
    if (diagram.ownerId === userId) return "owner";
    const diagramRole = this.diagramRole(diagramId, userId);
    if (diagramRole) return diagramRole;
    const workspaceRole = this.workspaceRole(diagram, userId);
    if (workspaceRole === "admin" || workspaceRole === "editor") return "editor";
    return workspaceRole;
  }

  async create(data: {
    title: string;
    ownerId: string;
    workspaceId?: string | null;
    folderId?: string | null;
    elements?: unknown[];
    appState?: Record<string, unknown>;
    createdVia?: string;
  }): Promise<Diagram> {
    const diagram: Diagram = {
      id: crypto.randomUUID(),
      ownerId: data.ownerId,
      workspaceId: data.workspaceId ?? null,
      folderId: data.folderId ?? null,
      title: data.title,
      elements: data.elements ?? [],
      appState: data.appState ?? {},
      thumbnail: null,
      starred: false,
      createdVia: data.createdVia ?? "ui",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(diagram);
    return diagram;
  }

  async update(
    id: string,
    data: Partial<Pick<Diagram, "title" | "elements" | "appState">>,
  ): Promise<Diagram | null> {
    const diagram = this.store.find((d) => d.id === id);
    if (!diagram) return null;
    if (data.title !== undefined) diagram.title = data.title;
    if (data.elements !== undefined || data.appState !== undefined) {
      const [first] = await this.scenes.findByDiagram(id);
      const elements = data.elements ?? first?.elements ?? diagram.elements;
      const appState = data.appState ?? first?.appState ?? diagram.appState;
      if (first) {
        await this.scenes.updateScene(first.id, elements, appState);
      } else {
        await this.scenes.create({
          diagramId: id,
          name: "Scene 1",
          sortOrder: 0,
          elements,
          appState,
        });
      }
      diagram.elements = elements;
      diagram.appState = appState;
    }
    diagram.updatedAt = new Date();
    return diagram;
  }

  async moveTo(id: string, folderId: string | null): Promise<void> {
    const diagram = this.store.find((d) => d.id === id);
    if (diagram) diagram.folderId = folderId;
  }

  async moveToWorkspace(id: string, workspaceId: string | null): Promise<void> {
    const diagram = this.store.find((d) => d.id === id);
    if (diagram) {
      diagram.workspaceId = workspaceId;
      diagram.folderId = null;
    }
  }

  async search(userId: string, query: string): Promise<Diagram[]> {
    const lower = query.toLowerCase();
    return this.store.filter(
      (d) => this.canSee(d, userId) && d.title.toLowerCase().includes(lower),
    );
  }

  async updateThumbnail(id: string, thumbnail: string): Promise<void> {
    const diagram = this.store.find((d) => d.id === id);
    if (diagram) diagram.thumbnail = thumbnail;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((d) => d.id !== id);
  }

  async toggleStar(id: string, starred: boolean): Promise<void> {
    const diagram = this.store.find((d) => d.id === id);
    if (diagram) diagram.starred = starred;
  }

  async transferBulkOwnership(diagramIds: string[], newOwnerId: string): Promise<void> {
    for (const d of this.store) {
      if (diagramIds.includes(d.id)) d.ownerId = newOwnerId;
    }
  }

  async findByOwnerInWorkspace(ownerId: string, workspaceId: string): Promise<Diagram[]> {
    return this.store.filter((d) => d.ownerId === ownerId && d.workspaceId === workspaceId);
  }
}

import type { Diagram, DiagramRole } from "../entities/diagram";

export interface DiagramRepository {
  findById(id: string): Promise<Diagram | null>;
  findByUser(userId: string, folderId?: string | null): Promise<Diagram[]>;
  findAccessRole(diagramId: string, userId: string): Promise<DiagramRole | null>;
  create(data: { title: string; ownerId: string; folderId?: string | null; elements?: unknown[]; appState?: Record<string, unknown> }): Promise<Diagram>;
  update(id: string, data: Partial<Pick<Diagram, "title" | "elements" | "appState">>): Promise<Diagram | null>;
  updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void>;
  moveTo(id: string, folderId: string | null): Promise<void>;
  updateThumbnail(id: string, thumbnail: string): Promise<void>;
  search(userId: string, query: string): Promise<Diagram[]>;
  delete(id: string): Promise<void>;
  toggleStar(id: string, starred: boolean): Promise<void>;
}

import type { Diagram, DiagramRole } from "../entities/diagram";

export interface DiagramRepository {
  findById(id: string): Promise<Diagram | null>;
  findByUser(userId: string): Promise<Diagram[]>;
  findAccessRole(diagramId: string, userId: string): Promise<DiagramRole | null>;
  create(data: { title: string; ownerId: string; elements?: unknown[]; appState?: Record<string, unknown> }): Promise<Diagram>;
  update(id: string, data: Partial<Pick<Diagram, "title" | "elements" | "appState">>): Promise<Diagram | null>;
  updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void>;
  delete(id: string): Promise<void>;
}

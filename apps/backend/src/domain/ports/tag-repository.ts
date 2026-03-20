import type { Tag } from "../entities/tag";

export interface TagRepository {
  create(ownerId: string, name: string, color: string): Promise<Tag>;
  list(ownerId: string): Promise<Tag[]>;
  delete(id: string, ownerId: string): Promise<void>;
  update(id: string, ownerId: string, data: { name?: string; color?: string }): Promise<Tag>;
  assignToDiagram(diagramId: string, tagId: string): Promise<void>;
  unassignFromDiagram(diagramId: string, tagId: string): Promise<void>;
  listForDiagram(diagramId: string): Promise<Tag[]>;
  listForDiagrams(diagramIds: string[]): Promise<Map<string, Tag[]>>;
}

import crypto from "crypto";
import type { TagRepository } from "../../domain/ports/tag-repository";
import type { Tag } from "../../domain/entities/tag";

export class InMemoryTagRepository implements TagRepository {
  store: Tag[] = [];
  assignments: { diagramId: string; tagId: string }[] = [];

  async create(ownerId: string, name: string, color: string): Promise<Tag> {
    const tag: Tag = {
      id: crypto.randomUUID(),
      ownerId,
      name,
      color,
      createdAt: new Date(),
    };
    this.store.push(tag);
    return tag;
  }

  async list(ownerId: string): Promise<Tag[]> {
    return this.store.filter((t) => t.ownerId === ownerId);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    this.store = this.store.filter((t) => !(t.id === id && t.ownerId === ownerId));
    this.assignments = this.assignments.filter((a) => a.tagId !== id);
  }

  async update(id: string, ownerId: string, data: { name?: string; color?: string }): Promise<Tag> {
    const tag = this.store.find((t) => t.id === id && t.ownerId === ownerId);
    if (!tag) throw new Error("Tag not found");
    if (data.name !== undefined) tag.name = data.name;
    if (data.color !== undefined) tag.color = data.color;
    return tag;
  }

  async assignToDiagram(diagramId: string, tagId: string): Promise<void> {
    const exists = this.assignments.some((a) => a.diagramId === diagramId && a.tagId === tagId);
    if (!exists) this.assignments.push({ diagramId, tagId });
  }

  async unassignFromDiagram(diagramId: string, tagId: string): Promise<void> {
    this.assignments = this.assignments.filter((a) => !(a.diagramId === diagramId && a.tagId === tagId));
  }

  async listForDiagram(diagramId: string): Promise<Tag[]> {
    const tagIds = this.assignments.filter((a) => a.diagramId === diagramId).map((a) => a.tagId);
    return this.store.filter((t) => tagIds.includes(t.id));
  }

  async listForDiagrams(diagramIds: string[]): Promise<Map<string, Tag[]>> {
    const result = new Map<string, Tag[]>();
    for (const diagramId of diagramIds) {
      result.set(diagramId, await this.listForDiagram(diagramId));
    }
    return result;
  }
}

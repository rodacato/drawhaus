import crypto from "crypto";
import type { TemplateRepository } from "../../domain/ports/template-repository";
import type { Template } from "../../domain/entities/template";

export class InMemoryTemplateRepository implements TemplateRepository {
  store: Template[] = [];

  async findById(id: string): Promise<Template | null> {
    return this.store.find((t) => t.id === id) ?? null;
  }

  async findByCreator(userId: string): Promise<Template[]> {
    return this.store.filter((t) => t.creatorId === userId);
  }

  async findByWorkspace(workspaceId: string): Promise<Template[]> {
    return this.store.filter((t) => t.workspaceId === workspaceId);
  }

  async findAll(): Promise<Template[]> {
    return [...this.store];
  }

  async create(data: {
    creatorId: string;
    workspaceId?: string | null;
    title: string;
    description: string;
    category: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    thumbnail?: string | null;
  }): Promise<Template> {
    const template: Template = {
      id: crypto.randomUUID(),
      creatorId: data.creatorId,
      workspaceId: data.workspaceId ?? null,
      title: data.title,
      description: data.description,
      category: data.category,
      elements: data.elements,
      appState: data.appState,
      thumbnail: data.thumbnail ?? null,
      isBuiltIn: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(template);
    return template;
  }

  async update(id: string, data: Partial<Pick<Template, "title" | "description" | "category" | "thumbnail">>): Promise<Template | null> {
    const template = this.store.find((t) => t.id === id);
    if (!template) return null;
    if (data.title !== undefined) template.title = data.title;
    if (data.description !== undefined) template.description = data.description;
    if (data.category !== undefined) template.category = data.category;
    if (data.thumbnail !== undefined) template.thumbnail = data.thumbnail;
    template.updatedAt = new Date();
    return template;
  }

  async incrementUsageCount(id: string): Promise<void> {
    const template = this.store.find((t) => t.id === id);
    if (template) template.usageCount += 1;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((t) => t.id !== id);
  }
}

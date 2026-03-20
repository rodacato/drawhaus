import type { Template } from "../entities/template";

export interface TemplateRepository {
  findById(id: string): Promise<Template | null>;
  findByCreator(userId: string): Promise<Template[]>;
  findByWorkspace(workspaceId: string): Promise<Template[]>;
  findAll(): Promise<Template[]>;
  create(data: {
    creatorId: string;
    workspaceId?: string | null;
    title: string;
    description: string;
    category: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    thumbnail?: string | null;
  }): Promise<Template>;
  update(id: string, data: Partial<Pick<Template, "title" | "description" | "category" | "thumbnail">>): Promise<Template | null>;
  incrementUsageCount(id: string): Promise<void>;
  delete(id: string): Promise<void>;

  // Ownership transfer
  transferBulkOwnership(templateIds: string[], newCreatorId: string): Promise<void>;
  findByCreatorInWorkspace(creatorId: string, workspaceId: string): Promise<Template[]>;
}

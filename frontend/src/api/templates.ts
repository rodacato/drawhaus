import { api } from "./client";

export type TemplateDTO = {
  id: string;
  creatorId: string;
  workspaceId: string | null;
  title: string;
  description: string;
  category: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  thumbnail: string | null;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export const templatesApi = {
  list: (workspaceId?: string): Promise<{ templates: TemplateDTO[] }> =>
    api.get("/api/templates", { params: workspaceId ? { workspaceId } : undefined }),

  get: (id: string): Promise<{ template: TemplateDTO }> =>
    api.get(`/api/templates/${id}`),

  create: (data: {
    title: string;
    description?: string;
    category?: string;
    workspaceId?: string | null;
    elements: unknown[];
    appState: Record<string, unknown>;
    thumbnail?: string | null;
  }): Promise<{ template: TemplateDTO }> =>
    api.post("/api/templates", data),

  use: (id: string, data: {
    title?: string;
    workspaceId?: string | null;
    folderId?: string | null;
  }): Promise<{ diagram: { id: string; title: string } }> =>
    api.post(`/api/templates/${id}/use`, data),

  update: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
  }): Promise<{ template: TemplateDTO }> =>
    api.patch(`/api/templates/${id}`, data),

  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/api/templates/${id}`),
};

import { api } from "./client";

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export const tagsApi = {
  list: () =>
    api.get("/api/tags") as Promise<{ tags: Tag[] }>,

  create: (name: string, color?: string) =>
    api.post("/api/tags", { name, color }) as Promise<{ tag: Tag }>,

  update: (id: string, data: { name?: string; color?: string }) =>
    api.patch(`/api/tags/${id}`, data) as Promise<{ tag: Tag }>,

  delete: (id: string) =>
    api.delete(`/api/tags/${id}`),

  assign: (tagId: string, diagramId: string) =>
    api.post(`/api/tags/${tagId}/assign`, { diagramId }),

  unassign: (tagId: string, diagramId: string) =>
    api.post(`/api/tags/${tagId}/unassign`, { diagramId }),
};

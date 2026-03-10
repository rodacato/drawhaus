import { api } from "./client";

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export const tagsApi = {
  list: () =>
    api.get("/api/tags").then((r) => r.data as { tags: Tag[] }),

  create: (name: string, color?: string) =>
    api.post("/api/tags", { name, color }).then((r) => r.data as { tag: Tag }),

  update: (id: string, data: { name?: string; color?: string }) =>
    api.patch(`/api/tags/${id}`, data).then((r) => r.data as { tag: Tag }),

  delete: (id: string) =>
    api.delete(`/api/tags/${id}`).then((r) => r.data),

  assign: (tagId: string, diagramId: string) =>
    api.post(`/api/tags/${tagId}/assign`, { diagramId }).then((r) => r.data),

  unassign: (tagId: string, diagramId: string) =>
    api.post(`/api/tags/${tagId}/unassign`, { diagramId }).then((r) => r.data),
};

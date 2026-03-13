import { api } from "./client";

export const diagramsApi = {
  list: (params?: { folderId?: string; workspaceId?: string }) =>
    api.get("/api/diagrams", { params }),

  search: (q: string) =>
    api.get("/api/diagrams/search", { params: { q } }),

  get: (id: string) =>
    api.get(`/api/diagrams/${id}`),

  create: (data: { title?: string; elements?: unknown; folderId?: string; workspaceId?: string }) =>
    api.post("/api/diagrams", data),

  update: (id: string, data: { title?: string; elements?: unknown; appState?: unknown }) =>
    api.patch(`/api/diagrams/${id}`, data),

  updateThumbnail: (id: string, thumbnail: string) =>
    api.put(`/api/diagrams/${id}/thumbnail`, { thumbnail }),

  move: (id: string, folderId: string | null) =>
    api.post(`/api/diagrams/${id}/move`, { folderId }),

  delete: (id: string) =>
    api.delete(`/api/diagrams/${id}`),

  duplicate: (id: string) =>
    api.post(`/api/diagrams/${id}/duplicate`),

  toggleStar: (id: string, starred: boolean) =>
    api.patch(`/api/diagrams/${id}/star`, { starred }),
};

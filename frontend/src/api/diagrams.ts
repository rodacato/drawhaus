import { api } from "./client";

export const diagramsApi = {
  list: (params?: { folderId?: string }) =>
    api.get("/api/diagrams", { params }).then((r) => r.data),

  search: (q: string) =>
    api.get("/api/diagrams/search", { params: { q } }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/api/diagrams/${id}`).then((r) => r.data),

  create: (data: { title?: string; elements?: unknown; folderId?: string }) =>
    api.post("/api/diagrams", data).then((r) => r.data),

  update: (id: string, data: { title?: string; elements?: unknown; appState?: unknown }) =>
    api.patch(`/api/diagrams/${id}`, data).then((r) => r.data),

  updateThumbnail: (id: string, thumbnail: string) =>
    api.put(`/api/diagrams/${id}/thumbnail`, { thumbnail }).then((r) => r.data),

  move: (id: string, folderId: string | null) =>
    api.post(`/api/diagrams/${id}/move`, { folderId }).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/api/diagrams/${id}`).then((r) => r.data),
};

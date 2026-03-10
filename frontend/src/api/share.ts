import { api } from "./client";

export const shareApi = {
  create: (diagramId: string, role: string, expiresInHours?: number) =>
    api.post(`/api/share/${diagramId}`, { role, expiresInHours }).then((r) => r.data),

  list: (diagramId: string) =>
    api.get(`/api/share/${diagramId}/links`).then((r) => r.data),

  deleteLink: (token: string) =>
    api.delete(`/api/share/link/${token}`).then((r) => r.data),

  resolve: (token: string) =>
    api.get(`/api/share/link/${token}`).then((r) => r.data),
};

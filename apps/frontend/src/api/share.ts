import { api } from "./client";

export const shareApi = {
  create: (diagramId: string, role: string, expiresInHours?: number) =>
    api.post(`/api/share/${diagramId}`, { role, expiresInHours }),

  list: (diagramId: string) =>
    api.get(`/api/share/${diagramId}/links`),

  deleteLink: (token: string) =>
    api.delete(`/api/share/link/${token}`),

  resolve: (token: string) =>
    api.get(`/api/share/link/${token}`),
};

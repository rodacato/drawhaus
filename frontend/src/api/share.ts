import { api } from "./client";

export const shareApi = {
  create: (diagramId: string, role: string, expiresInDays?: number) =>
    api.post(`/api/share/${diagramId}`, { role, expiresInDays }).then((r) => r.data),

  resolve: (token: string) =>
    api.get(`/api/share/link/${token}`).then((r) => r.data),
};

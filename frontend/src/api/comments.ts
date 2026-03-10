import { api } from "./client";

export const commentsApi = {
  list: (diagramId: string, sceneId?: string | null) =>
    api.get(`/api/diagrams/${diagramId}/comments`, { params: sceneId ? { sceneId } : undefined }).then((r) => r.data),

  create: (diagramId: string, data: { elementId: string; body: string; sceneId?: string | null }) =>
    api.post(`/api/diagrams/${diagramId}/comments`, data).then((r) => r.data),

  reply: (diagramId: string, threadId: string, data: { body: string }) =>
    api.post(`/api/diagrams/${diagramId}/comments/${threadId}/replies`, data).then((r) => r.data),

  resolve: (diagramId: string, threadId: string, resolved: boolean) =>
    api.patch(`/api/diagrams/${diagramId}/comments/${threadId}/resolve`, { resolved }).then((r) => r.data),

  delete: (diagramId: string, threadId: string) =>
    api.delete(`/api/diagrams/${diagramId}/comments/${threadId}`).then((r) => r.data),

  toggleLike: (diagramId: string, threadId: string) =>
    api.post(`/api/diagrams/${diagramId}/comments/${threadId}/like`).then((r) => r.data as { liked: boolean; likeCount: number }),
};

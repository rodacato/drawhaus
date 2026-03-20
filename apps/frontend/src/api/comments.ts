import { api } from "./client";

export const commentsApi = {
  list: (diagramId: string, sceneId?: string | null) =>
    api.get(`/api/diagrams/${diagramId}/comments`, { params: sceneId ? { sceneId } : undefined }),

  create: (diagramId: string, data: { elementId: string; body: string; sceneId?: string | null }) =>
    api.post(`/api/diagrams/${diagramId}/comments`, data),

  reply: (diagramId: string, threadId: string, data: { body: string }) =>
    api.post(`/api/diagrams/${diagramId}/comments/${threadId}/replies`, data),

  resolve: (diagramId: string, threadId: string, resolved: boolean) =>
    api.patch(`/api/diagrams/${diagramId}/comments/${threadId}/resolve`, { resolved }),

  delete: (diagramId: string, threadId: string) =>
    api.delete(`/api/diagrams/${diagramId}/comments/${threadId}`),

  toggleLike: (diagramId: string, threadId: string) =>
    api.post(`/api/diagrams/${diagramId}/comments/${threadId}/like`) as Promise<{ liked: boolean; likeCount: number }>,
};

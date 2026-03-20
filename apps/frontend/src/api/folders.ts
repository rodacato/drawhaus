import { api } from "./client";

export const foldersApi = {
  list: (workspaceId?: string) =>
    api.get("/api/folders", { params: workspaceId ? { workspaceId } : undefined }),

  create: (name: string, workspaceId?: string) =>
    api.post("/api/folders", { name, workspaceId }),

  delete: (id: string) =>
    api.delete(`/api/folders/${id}`),
};

import { api } from "./client";

export const foldersApi = {
  list: (workspaceId?: string) =>
    api.get("/api/folders", { params: workspaceId ? { workspaceId } : undefined }).then((r) => r.data),

  create: (name: string, workspaceId?: string) =>
    api.post("/api/folders", { name, workspaceId }).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/api/folders/${id}`).then((r) => r.data),
};

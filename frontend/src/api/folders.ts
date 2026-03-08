import { api } from "./client";

export const foldersApi = {
  list: () => api.get("/api/folders").then((r) => r.data),

  create: (name: string) =>
    api.post("/api/folders", { name }).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/api/folders/${id}`).then((r) => r.data),
};

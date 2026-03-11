import { api } from "./client";

export type Workspace = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  isPersonal: boolean;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  userId: string;
  role: "admin" | "editor" | "viewer";
  userName: string;
  userEmail: string;
  addedAt: string;
};

export const workspacesApi = {
  list: () =>
    api.get("/api/workspaces").then((r) => r.data as { workspaces: Workspace[] }),

  get: (id: string) =>
    api.get(`/api/workspaces/${id}`).then((r) => r.data as { workspace: Workspace; role: string; members: WorkspaceMember[] }),

  create: (data: { name: string; description?: string; color?: string; icon?: string }) =>
    api.post("/api/workspaces", data).then((r) => r.data as { workspace: Workspace }),

  update: (id: string, data: { name?: string; description?: string; color?: string; icon?: string }) =>
    api.patch(`/api/workspaces/${id}`, data).then((r) => r.data as { workspace: Workspace }),

  delete: (id: string) =>
    api.delete(`/api/workspaces/${id}`).then((r) => r.data),

  invite: (id: string, email: string, role: string = "editor") =>
    api.post(`/api/workspaces/${id}/invite`, { email, role }).then((r) => r.data),

  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    api.patch(`/api/workspaces/${workspaceId}/members/${userId}`, { role }).then((r) => r.data),

  removeMember: (workspaceId: string, userId: string) =>
    api.delete(`/api/workspaces/${workspaceId}/members/${userId}`).then((r) => r.data),

  acceptInvite: (token: string) =>
    api.post("/api/workspaces/accept-invite", { token }).then((r) => r.data),

  resolveInvite: (token: string) =>
    api.get(`/api/workspaces/invite/${token}`).then((r) => r.data as { workspaceName: string; role: string; email: string }),
};

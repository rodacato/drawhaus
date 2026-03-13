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
    api.get("/api/workspaces") as Promise<{ workspaces: Workspace[] }>,

  get: (id: string) =>
    api.get(`/api/workspaces/${id}`) as Promise<{ workspace: Workspace; role: string; members: WorkspaceMember[] }>,

  create: (data: { name: string; description?: string; color?: string; icon?: string }) =>
    api.post("/api/workspaces", data) as Promise<{ workspace: Workspace }>,

  update: (id: string, data: { name?: string; description?: string; color?: string; icon?: string }) =>
    api.patch(`/api/workspaces/${id}`, data) as Promise<{ workspace: Workspace }>,

  delete: (id: string) =>
    api.delete(`/api/workspaces/${id}`),

  invite: (id: string, email: string, role: string = "editor") =>
    api.post(`/api/workspaces/${id}/invite`, { email, role }),

  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    api.patch(`/api/workspaces/${workspaceId}/members/${userId}`, { role }),

  removeMember: (workspaceId: string, userId: string) =>
    api.delete(`/api/workspaces/${workspaceId}/members/${userId}`),

  acceptInvite: (token: string) =>
    api.post("/api/workspaces/accept-invite", { token }),

  resolveInvite: (token: string) =>
    api.get(`/api/workspaces/invite/${token}`) as Promise<{ workspaceName: string; role: string; email: string }>,
};

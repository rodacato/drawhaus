import { api } from "./client";

export const siteApi = {
  getStatus: () => api.get("/api/site/status").then((r) => r.data) as Promise<{ maintenanceMode: boolean; instanceName: string }>,
};

export const adminApi = {
  getMetrics: () => api.get("/api/admin/metrics").then((r) => r.data),

  listUsers: () => api.get("/api/admin/users").then((r) => r.data),

  updateUser: (id: string, data: { role?: string; disabled?: boolean }) =>
    api.patch(`/api/admin/users/${id}`, data).then((r) => r.data),

  deleteUser: (id: string) =>
    api.delete(`/api/admin/users/${id}`).then((r) => r.data),

  getSettings: () => api.get("/api/admin/settings").then((r) => r.data),

  updateSettings: (data: { instanceName?: string; registrationOpen?: boolean; maintenanceMode?: boolean; maxWorkspacesPerUser?: number; maxMembersPerWorkspace?: number }) =>
    api.patch("/api/admin/settings", data).then((r) => r.data),

  inviteUser: (email: string, role: string = "user") =>
    api.post("/api/admin/invite", { email, role }).then((r) => r.data),

  listInvitations: () =>
    api.get("/api/admin/invitations").then((r) => r.data),

  getIntegrations: () =>
    api.get("/api/admin/integrations").then((r) => r.data as {
      integrations: { key: string; source: "db" | "env" | "none"; maskedValue: string }[];
      encryptionEnabled: boolean;
    }),

  updateIntegration: (key: string, value: string) =>
    api.patch("/api/admin/integrations", { key, value }).then((r) => r.data),
};

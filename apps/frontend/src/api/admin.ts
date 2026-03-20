import { api } from "./client";

export const siteApi = {
  getStatus: () => api.get("/api/site/status") as Promise<{ maintenanceMode: boolean; instanceName: string }>,
};

export const adminApi = {
  getMetrics: () => api.get("/api/admin/metrics"),

  listUsers: () => api.get("/api/admin/users"),

  updateUser: (id: string, data: { role?: string; disabled?: boolean }) =>
    api.patch(`/api/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/api/admin/users/${id}`),

  getSettings: () => api.get("/api/admin/settings"),

  updateSettings: (data: { instanceName?: string; registrationOpen?: boolean; maintenanceMode?: boolean; maxWorkspacesPerUser?: number; maxMembersPerWorkspace?: number; backupEnabled?: boolean; backupCron?: string; backupRetentionDays?: number }) =>
    api.patch("/api/admin/settings", data),

  inviteUser: (email: string, role: string = "user") =>
    api.post("/api/admin/invite", { email, role }),

  listInvitations: () =>
    api.get("/api/admin/invitations"),

  getIntegrations: () =>
    api.get("/api/admin/integrations") as Promise<{
      integrations: { key: string; source: "db" | "env" | "none"; maskedValue: string }[];
      encryptionEnabled: boolean;
    }>,

  updateIntegration: (key: string, value: string) =>
    api.patch("/api/admin/integrations", { key, value }),
};

import { api } from "./client";

export const siteApi = {
  getStatus: () =>
    api.get("/api/site/status") as Promise<{ maintenanceMode: boolean; instanceName: string }>,
};

export type AdminWebhook = {
  id: string;
  url: string;
  description: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminWebhookDelivery = {
  id: string;
  eventId: string;
  eventType: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string;
  deliveredAt: string | null;
  createdAt: string;
};

export type AdminWebhookTestResult = { ok: true; status: number } | { ok: false; error: string };

export const adminApi = {
  getMetrics: () => api.get("/api/admin/metrics"),

  listUsers: () => api.get("/api/admin/users"),

  updateUser: (id: string, data: { role?: string; disabled?: boolean }) =>
    api.patch(`/api/admin/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),

  getSettings: () => api.get("/api/admin/settings"),

  updateSettings: (data: {
    instanceName?: string;
    registrationOpen?: boolean;
    maintenanceMode?: boolean;
    maxWorkspacesPerUser?: number;
    maxMembersPerWorkspace?: number;
    backupEnabled?: boolean;
    backupCron?: string;
    backupRetentionDays?: number;
  }) => api.patch("/api/admin/settings", data),

  inviteUser: (email: string, role: string = "user") =>
    api.post("/api/admin/invite", { email, role }),

  listInvitations: () => api.get("/api/admin/invitations"),

  getIntegrations: () =>
    api.get("/api/admin/integrations") as Promise<{
      integrations: { key: string; source: "db" | "env" | "none"; maskedValue: string }[];
      encryptionEnabled: boolean;
    }>,

  updateIntegration: (key: string, value: string) =>
    api.patch("/api/admin/integrations", { key, value }),

  listWebhooks: () =>
    api.get("/api/admin/webhooks") as Promise<{
      webhooks: AdminWebhook[];
      events: string[];
      encryptionEnabled: boolean;
    }>,

  createWebhook: (data: { url: string; description?: string; events: string[] }) =>
    api.post("/api/admin/webhooks", data) as Promise<{ webhook: AdminWebhook; secret: string }>,

  updateWebhook: (
    id: string,
    data: { url?: string; description?: string; events?: string[]; active?: boolean },
  ) => api.patch(`/api/admin/webhooks/${id}`, data) as Promise<{ webhook: AdminWebhook }>,

  deleteWebhook: (id: string) => api.delete(`/api/admin/webhooks/${id}`),

  regenerateWebhookSecret: (id: string) =>
    api.post(`/api/admin/webhooks/${id}/secret`) as Promise<{
      webhook: AdminWebhook;
      secret: string;
    }>,

  listWebhookDeliveries: (id: string) =>
    api.get(`/api/admin/webhooks/${id}/deliveries`) as Promise<{
      deliveries: AdminWebhookDelivery[];
    }>,

  testWebhook: (id: string) =>
    api.post(`/api/admin/webhooks/${id}/test`) as Promise<{ result: AdminWebhookTestResult }>,
};

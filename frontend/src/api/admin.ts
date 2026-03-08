import { api } from "./client";

export const adminApi = {
  getMetrics: () => api.get("/api/admin/metrics").then((r) => r.data),

  listUsers: () => api.get("/api/admin/users").then((r) => r.data),

  updateUser: (id: string, data: { role?: string; disabled?: boolean }) =>
    api.patch(`/api/admin/users/${id}`, data).then((r) => r.data),

  getSettings: () => api.get("/api/admin/settings").then((r) => r.data),

  updateSettings: (data: { instanceName?: string; registrationOpen?: boolean }) =>
    api.patch("/api/admin/settings", data).then((r) => r.data),
};

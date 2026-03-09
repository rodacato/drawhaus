import { api } from "./client";

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post("/api/auth/register", { name, email, password }).then((r) => r.data),

  logout: () => api.post("/api/auth/logout").then((r) => r.data),

  getMe: () => api.get("/api/auth/me").then((r) => r.data),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch("/api/auth/me", data).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }).then((r) => r.data),

  getSetupStatus: () =>
    api.get("/api/auth/setup-status").then((r) => r.data as { needsSetup: boolean }),
};

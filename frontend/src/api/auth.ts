import { api } from "./client";

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post("/api/auth/register", { name, email, password }).then((r) => r.data),

  logout: () => api.post("/api/auth/logout").then((r) => r.data),

  getMe: () => api.get("/api/auth/me").then((r) => r.data.user),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch("/api/auth/me", data).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }).then((r) => r.data),

  getSetupStatus: () =>
    api.get("/api/auth/setup-status").then((r) => r.data as { needsSetup: boolean }),

  resolveInvite: (token: string) =>
    api.get(`/api/auth/invite/${token}`).then((r) => r.data as { email: string; role: string }),

  acceptInvite: (token: string, name: string, password: string) =>
    api.post("/api/auth/accept-invite", { token, name, password }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }).then((r) => r.data),

  validateResetToken: (token: string) =>
    api.get(`/api/auth/reset-password/${token}`).then((r) => r.data as { valid: boolean }),

  resetPassword: (token: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { token, newPassword }).then((r) => r.data),
};

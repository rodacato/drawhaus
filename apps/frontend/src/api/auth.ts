import { api } from "./client";

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post("/api/auth/register", { name, email, password }),

  logout: () => api.post("/api/auth/logout"),

  getMe: () => api.get("/api/auth/me").then((r: any) => r.user),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch("/api/auth/me", data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }),

  getSetupStatus: () =>
    api.get("/api/auth/setup-status") as Promise<{ needsSetup: boolean }>,

  resolveInvite: (token: string) =>
    api.get(`/api/auth/invite/${token}`) as Promise<{ email: string; role: string }>,

  acceptInvite: (token: string, name: string, password: string) =>
    api.post("/api/auth/accept-invite", { token, name, password }),

  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),

  validateResetToken: (token: string) =>
    api.get(`/api/auth/reset-password/${token}`) as Promise<{ valid: boolean }>,

  resetPassword: (token: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { token, newPassword }),

  deleteAccount: (password: string) =>
    api.delete("/api/auth/account", { data: { password } }),
};

import { Router } from "express";
import { parse } from "cookie";
import { z } from "zod";
import type { RegisterUseCase } from "../../../application/use-cases/auth/register";
import type { LoginUseCase } from "../../../application/use-cases/auth/login";
import type { LogoutUseCase } from "../../../application/use-cases/auth/logout";
import type { GetCurrentUserUseCase } from "../../../application/use-cases/auth/get-current-user";
import type { UpdateProfileUseCase } from "../../../application/use-cases/auth/update-profile";
import type { ChangePasswordUseCase } from "../../../application/use-cases/auth/change-password";
import type { AcceptInviteUseCase } from "../../../application/use-cases/auth/accept-invite";
import type { ForgotPasswordUseCase } from "../../../application/use-cases/auth/forgot-password";
import type { ResetPasswordUseCase } from "../../../application/use-cases/auth/reset-password";
import type { DeleteAccountUseCase } from "../../../application/use-cases/auth/delete-account";
import { asyncPublicRoute, asyncRoute } from "../middleware/async-handler";
import { config } from "../../config";

const registerSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
});

function getCookieOptions() {
  const isProduction = config.nodeEnv === "production";
  return {
    httpOnly: true,
    sameSite: isProduction ? "none" as const : "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

export function createAuthRoutes(
  useCases: {
    register: RegisterUseCase;
    login: LoginUseCase;
    logout: LogoutUseCase;
    getCurrentUser: GetCurrentUserUseCase;
    updateProfile: UpdateProfileUseCase;
    changePassword: ChangePasswordUseCase;
    acceptInvite: AcceptInviteUseCase;
    forgotPassword: ForgotPasswordUseCase;
    resetPassword: ResetPasswordUseCase;
    deleteAccount: DeleteAccountUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();

  router.get("/setup-status", asyncPublicRoute(async (_req, res) => {
    const needsSetup = await useCases.register.needsSetup();
    return res.status(200).json({ needsSetup });
  }));

  router.post("/register", asyncPublicRoute(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const result = await useCases.register.execute(parsed.data);
    res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
    return res.status(201).json({ user: result.user });
  }));

  router.post("/login", asyncPublicRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const result = await useCases.login.execute(parsed.data);
    res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
    return res.status(200).json({ user: result.user });
  }));

  router.post("/logout", asyncPublicRoute(async (req, res) => {
    const cookieHeader = req.headers.cookie;
    const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;
    await useCases.logout.execute(token);
    res.clearCookie(config.cookieName, {
      httpOnly: true,
      sameSite: config.nodeEnv === "production" ? "none" as const : "lax" as const,
      secure: config.nodeEnv === "production",
      path: "/",
      ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
    });
    return res.status(200).json({ success: true });
  }));

  router.get("/me", asyncPublicRoute(async (req, res) => {
    const cookieHeader = req.headers.cookie;
    const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;
    const user = await useCases.getCurrentUser.execute(token);
    return res.status(200).json({ user });
  }));

  router.patch("/me", requireAuth, asyncRoute(async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const user = await useCases.updateProfile.execute(req.authUser.id, parsed.data);
    return res.status(200).json({ user });
  }));

  router.post("/change-password", requireAuth, asyncRoute(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    await useCases.changePassword.execute(req.authUser.id, parsed.data);
    return res.status(200).json({ success: true });
  }));

  // --- Invite acceptance ---

  router.get("/invite/:token", asyncPublicRoute(async (req, res) => {
    const result = await useCases.acceptInvite.resolve(req.params.token as string);
    return res.status(200).json(result);
  }));

  router.post("/accept-invite", asyncPublicRoute(async (req, res) => {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const result = await useCases.acceptInvite.execute(parsed.data);
    res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
    return res.status(201).json({ user: result.user });
  }));

  // --- Forgot / Reset password ---

  router.post("/forgot-password", asyncPublicRoute(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    await useCases.forgotPassword.execute(parsed.data.email);
    return res.status(200).json({ success: true });
  }));

  router.get("/reset-password/:token", asyncPublicRoute(async (req, res) => {
    const result = await useCases.resetPassword.validate(req.params.token as string);
    return res.status(200).json(result);
  }));

  router.post("/reset-password", asyncPublicRoute(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    await useCases.resetPassword.execute(parsed.data);
    return res.status(200).json({ success: true });
  }));

  // --- Delete account ---

  router.delete("/account", requireAuth, asyncRoute(async (req, res) => {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Password is required" });

    await useCases.deleteAccount.execute(req.authUser.id, parsed.data.password);
    res.clearCookie(config.cookieName, {
      httpOnly: true,
      sameSite: config.nodeEnv === "production" ? "none" as const : "lax" as const,
      secure: config.nodeEnv === "production",
      path: "/",
      ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
    });
    return res.status(200).json({ success: true });
  }));

  return router;
}

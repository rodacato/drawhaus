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
import type { GoogleAuthUseCase } from "../../../application/use-cases/auth/google-auth";
import { asyncPublicRoute, asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
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
  currentPassword: z.string().min(1).max(128).optional(),
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
  password: z.string().min(1).max(128).optional(),
});

function getClearCookieOptions() {
  const isProduction = config.nodeEnv === "production";
  return {
    httpOnly: true,
    sameSite: (isProduction && config.cookieDomain) ? "none" as const : "lax" as const,
    secure: isProduction,
    path: "/",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

function getCookieOptions() {
  return {
    ...getClearCookieOptions(),
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
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
    googleAuth: GoogleAuthUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();

  router.get("/setup-status", asyncPublicRoute(async (_req, res) => {
    const needsSetup = await useCases.register.needsSetup();
    return res.status(200).json({ needsSetup });
  }));

  router.post("/register", validate(registerSchema), asyncPublicRoute(async (req, res) => {
    const result = await useCases.register.execute(req.body);
    res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
    return res.status(201).json({ user: result.user });
  }));

  router.post("/login", validate(loginSchema), asyncPublicRoute(async (req, res) => {
    const result = await useCases.login.execute(req.body);
    res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
    return res.status(200).json({ user: result.user });
  }));

  router.post("/logout", asyncPublicRoute(async (req, res) => {
    const cookieHeader = req.headers.cookie;
    const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;
    await useCases.logout.execute(token);
    res.clearCookie(config.cookieName, getClearCookieOptions());
    return res.status(200).json({ success: true });
  }));

  router.get("/me", asyncPublicRoute(async (req, res) => {
    const cookieHeader = req.headers.cookie;
    const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;
    const user = await useCases.getCurrentUser.execute(token);
    return res.status(200).json({ user });
  }));

  router.patch("/me", requireAuth, validate(updateProfileSchema), asyncRoute(async (req, res) => {
    const user = await useCases.updateProfile.execute(req.authUser.id, req.body);
    return res.status(200).json({ user });
  }));

  router.post("/change-password", requireAuth, validate(changePasswordSchema), asyncRoute(async (req, res) => {
    await useCases.changePassword.execute(req.authUser.id, req.body);
    return res.status(200).json({ success: true });
  }));

  // --- Invite acceptance ---

  router.get("/invite/:token", asyncPublicRoute(async (req, res) => {
    const result = await useCases.acceptInvite.resolve(req.params.token as string);
    return res.status(200).json(result);
  }));

  router.post("/accept-invite", validate(acceptInviteSchema), asyncPublicRoute(async (req, res) => {
    const result = await useCases.acceptInvite.execute(req.body);
    res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
    return res.status(201).json({ user: result.user });
  }));

  // --- Forgot / Reset password ---

  router.post("/forgot-password", validate(forgotPasswordSchema), asyncPublicRoute(async (req, res) => {
    await useCases.forgotPassword.execute(req.body.email);
    return res.status(200).json({ success: true });
  }));

  router.get("/reset-password/:token", asyncPublicRoute(async (req, res) => {
    const result = await useCases.resetPassword.validate(req.params.token as string);
    return res.status(200).json(result);
  }));

  router.post("/reset-password", validate(resetPasswordSchema), asyncPublicRoute(async (req, res) => {
    await useCases.resetPassword.execute(req.body);
    return res.status(200).json({ success: true });
  }));

  // --- Delete account ---

  router.delete("/account", requireAuth, validate(deleteAccountSchema), asyncRoute(async (req, res) => {
    await useCases.deleteAccount.execute(req.authUser.id, req.body.password ?? null);
    res.clearCookie(config.cookieName, getClearCookieOptions());
    return res.status(200).json({ success: true });
  }));

  // --- Google OAuth ---

  function setOAuthStateCookie(res: import("express").Response, statePayload: string) {
    res.cookie("drawhaus_oauth_state", statePayload, {
      ...getClearCookieOptions(),
      maxAge: 10 * 60 * 1000,
    });
  }

  function clearOAuthStateCookie(res: import("express").Response) {
    res.clearCookie("drawhaus_oauth_state", getClearCookieOptions());
  }

  router.get("/google", (_req, res) => {
    if (!useCases.googleAuth.isEnabled) {
      return res.status(404).json({ error: "Google OAuth is not configured" });
    }

    const csrf = useCases.googleAuth.generateStateToken();
    setOAuthStateCookie(res, JSON.stringify({ csrf, flow: "login" }));

    const authUrl = useCases.googleAuth.getAuthorizationUrl(csrf);
    return res.redirect(authUrl);
  });

  // Drive scope upgrade (requires auth — user must be logged in)
  router.get("/google/drive", requireAuth, asyncRoute(async (req, res) => {
    if (!useCases.googleAuth.isEnabled) {
      return res.status(404).json({ error: "Google OAuth is not configured" });
    }

    const csrf = useCases.googleAuth.generateStateToken();
    setOAuthStateCookie(res, JSON.stringify({ csrf, flow: "drive", userId: req.authUser.id }));

    const authUrl = useCases.googleAuth.getAuthorizationUrl(csrf, [
      "openid", "email", "profile",
      "https://www.googleapis.com/auth/drive.file",
    ]);
    return res.redirect(authUrl);
  }));

  router.get("/google/callback", asyncPublicRoute(async (req, res) => {
    const { code, state } = req.query;
    const cookieHeader = req.headers.cookie;
    const rawState = cookieHeader ? (parse(cookieHeader)["drawhaus_oauth_state"] ?? null) : null;

    clearOAuthStateCookie(res);

    // Parse state payload
    let statePayload: { csrf: string; flow: string; userId?: string };
    try {
      statePayload = JSON.parse(rawState ?? "");
    } catch {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }

    // Validate CSRF
    if (!state || state !== statePayload.csrf) {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }

    if (!code || typeof code !== "string") {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }

    // Branch by flow type
    if (statePayload.flow === "drive" && statePayload.userId) {
      try {
        await useCases.googleAuth.handleDriveCallback(code, statePayload.userId);
        return res.redirect(`${config.frontendUrl}/settings?tab=integrations&drive=connected`);
      } catch {
        return res.redirect(`${config.frontendUrl}/settings?tab=integrations&drive=error`);
      }
    }

    // Default: login flow
    try {
      const result = await useCases.googleAuth.handleCallback(code);
      res.cookie(config.cookieName, result.sessionToken, getCookieOptions());
      return res.redirect(result.redirectUrl);
    } catch {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }
  }));

  return router;
}

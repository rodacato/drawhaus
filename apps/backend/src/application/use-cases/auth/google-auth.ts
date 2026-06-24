import crypto from "node:crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import { ConflictError, ForbiddenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

type GoogleUserInfo = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

export class GoogleAuthUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly oauthTokens: OAuthTokenRepository,
    private readonly siteSettings?: SiteSettingsRepository,
  ) {}

  get isEnabled(): boolean {
    return !!(config.googleClientId && config.googleClientSecret && config.googleRedirectUri);
  }

  generateStateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  getAuthorizationUrl(state: string, scopes: string[] = ["openid", "email", "profile"]): string {
    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: config.googleRedirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<{ sessionToken: string; redirectUrl: string }> {
    const tokens = await this.exchangeCode(code);
    const googleUser = await this.fetchUserInfo(tokens.access_token);
    const user = await this.resolveOrCreateUser(googleUser);

    if (user.disabled) {
      throw new ForbiddenError();
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await this.oauthTokens.upsert({
      userId: user.id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      scopes: tokens.scope,
    });

    const session = await this.sessions.create(user.id);

    return {
      sessionToken: session.token,
      redirectUrl: `${config.frontendUrl}/dashboard`,
    };
  }

  private async resolveOrCreateUser(googleUser: GoogleUserInfo) {
    const byGoogleId = await this.users.findByGoogleId(googleUser.id);
    if (byGoogleId) {
      const updates: Partial<{ name: string; avatarUrl: string }> = {};
      if (byGoogleId.name !== googleUser.name) updates.name = googleUser.name;
      if (googleUser.picture && byGoogleId.avatarUrl !== googleUser.picture) {
        updates.avatarUrl = googleUser.picture;
      }
      if (Object.keys(updates).length > 0) {
        await this.users.update(byGoogleId.id, updates);
        return (await this.users.findById(byGoogleId.id))!;
      }
      return byGoogleId;
    }

    const byEmail = await this.users.findByEmail(googleUser.email.toLowerCase());
    if (byEmail) {
      throw new ConflictError(
        "An account with this email already exists. Sign in with your password and link Google from Settings.",
      );
    }

    const userCount = await this.users.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser && this.siteSettings) {
      const settings = await this.siteSettings.get();
      if (!settings.registrationOpen) {
        throw new ForbiddenError();
      }
    }

    const created = await this.users.create({
      email: googleUser.email.toLowerCase(),
      name: googleUser.name,
      passwordHash: null,
      googleId: googleUser.id,
      avatarUrl: googleUser.picture,
    });

    if (isFirstUser) {
      await this.users.adminUpdate(created.id, { role: "admin" });
      created.role = "admin";
    }

    return created;
  }

  async handleLinkCallback(code: string, userId: string): Promise<void> {
    const tokens = await this.exchangeCode(code);
    const googleUser = await this.fetchUserInfo(tokens.access_token);

    // Check if this Google account is already linked to another user
    const existingUser = await this.users.findByGoogleId(googleUser.id);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("This Google account is already linked to another user");
    }

    await this.users.update(userId, {
      googleId: googleUser.id,
      avatarUrl: (await this.users.findById(userId))?.avatarUrl ?? googleUser.picture ?? null,
    });

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await this.oauthTokens.upsert({
      userId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      scopes: tokens.scope,
    });
  }

  async handleDriveCallback(code: string, userId: string): Promise<void> {
    const tokens = await this.exchangeCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await this.oauthTokens.upsert({
      userId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      scopes: tokens.scope,
    });
  }

  private async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google token exchange failed: ${body}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Google user info");
    }

    return response.json() as Promise<GoogleUserInfo>;
  }
}

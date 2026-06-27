import crypto from "node:crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { OAuthProviderPort, OAuthProfile } from "../../../domain/ports/oauth-provider";
import { ConflictError, ForbiddenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

export class GoogleAuthUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly oauthTokens: OAuthTokenRepository,
    private readonly siteSettings: SiteSettingsRepository,
    private readonly provider: OAuthProviderPort,
  ) {}

  get isEnabled(): boolean {
    return this.provider.isEnabled;
  }

  generateStateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  getAuthorizationUrl(state: string, scopes: string[] = ["openid", "email", "profile"]): string {
    return this.provider.getAuthorizationUrl(state, scopes);
  }

  async handleCallback(code: string): Promise<{ sessionToken: string; redirectUrl: string }> {
    const tokens = await this.provider.exchangeCode(code);
    const profile = await this.provider.fetchUserInfo(tokens.accessToken);
    const user = await this.resolveOrCreateUser(profile);

    if (user.disabled) {
      throw new ForbiddenError();
    }

    await this.oauthTokens.upsert({
      userId: user.id,
      provider: "google",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
      scopes: tokens.scopes,
    });

    const session = await this.sessions.create(user.id);

    return {
      sessionToken: session.token,
      redirectUrl: `${config.frontendUrl}/dashboard`,
    };
  }

  private async resolveOrCreateUser(profile: OAuthProfile) {
    const byGoogleId = await this.users.findByGoogleId(profile.providerId);
    if (byGoogleId) {
      const updates: Partial<{ name: string; avatarUrl: string }> = {};
      if (profile.name && byGoogleId.name !== profile.name) updates.name = profile.name;
      if (profile.avatarUrl && byGoogleId.avatarUrl !== profile.avatarUrl) {
        updates.avatarUrl = profile.avatarUrl;
      }
      if (Object.keys(updates).length > 0) {
        await this.users.update(byGoogleId.id, updates);
        return (await this.users.findById(byGoogleId.id))!;
      }
      return byGoogleId;
    }

    const email = (profile.email ?? "").toLowerCase();
    const byEmail = await this.users.findByEmail(email);
    if (byEmail) {
      throw new ConflictError(
        "An account with this email already exists. Sign in with your password and link Google from Settings.",
      );
    }

    const userCount = await this.users.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      const settings = await this.siteSettings.get();
      if (!settings.registrationOpen) {
        throw new ForbiddenError();
      }
    }

    const created = await this.users.create({
      email,
      name: profile.name ?? "",
      passwordHash: null,
      googleId: profile.providerId,
      avatarUrl: profile.avatarUrl ?? undefined,
    });

    if (isFirstUser) {
      await this.users.adminUpdate(created.id, { role: "admin" });
      created.role = "admin";
    }

    return created;
  }

  async handleLinkCallback(code: string, userId: string): Promise<void> {
    const tokens = await this.provider.exchangeCode(code);
    const profile = await this.provider.fetchUserInfo(tokens.accessToken);

    const existingUser = await this.users.findByGoogleId(profile.providerId);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("This Google account is already linked to another user");
    }

    await this.users.update(userId, {
      googleId: profile.providerId,
      avatarUrl: (await this.users.findById(userId))?.avatarUrl ?? profile.avatarUrl ?? null,
    });

    await this.oauthTokens.upsert({
      userId,
      provider: "google",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
      scopes: tokens.scopes,
    });
  }

  async handleDriveCallback(code: string, userId: string): Promise<void> {
    const tokens = await this.provider.exchangeCode(code);
    await this.oauthTokens.upsert({
      userId,
      provider: "google",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
      scopes: tokens.scopes,
    });
  }
}

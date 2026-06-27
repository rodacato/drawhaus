import crypto from "node:crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { OAuthProviderPort, OAuthProfile } from "../../../domain/ports/oauth-provider";
import { ConflictError, ForbiddenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

export class GitHubAuthUseCase {
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

  getAuthorizationUrl(state: string): string {
    return this.provider.getAuthorizationUrl(state);
  }

  async handleCallback(code: string): Promise<{ sessionToken: string; redirectUrl: string }> {
    const tokens = await this.provider.exchangeCode(code);
    const profile = await this.provider.fetchUserInfo(tokens.accessToken);
    const email = this.requireEmail(profile);
    const user = await this.resolveOrCreateUser(profile, email);

    if (user.disabled) {
      throw new ForbiddenError();
    }

    await this.oauthTokens.upsert({
      userId: user.id,
      provider: "github",
      accessToken: tokens.accessToken,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
      scopes: tokens.scopes,
    });

    const session = await this.sessions.create(user.id);

    return {
      sessionToken: session.token,
      redirectUrl: `${config.frontendUrl}/dashboard`,
    };
  }

  private requireEmail(profile: OAuthProfile): string {
    if (!profile.email) {
      throw new Error("GitHub account has no verified email address");
    }
    return profile.email;
  }

  private async resolveOrCreateUser(profile: OAuthProfile, email: string) {
    const login = profile.username ?? "";
    const byGithubId = await this.users.findByGitHubId(profile.providerId);
    if (byGithubId) {
      if (byGithubId.githubUsername !== login) {
        await this.users.update(byGithubId.id, { githubUsername: login });
      }
      return byGithubId;
    }

    const byEmail = await this.users.findByEmail(email.toLowerCase());
    if (byEmail) {
      throw new ConflictError(
        "An account with this email already exists. Sign in with your password and link GitHub from Settings.",
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
      email: email.toLowerCase(),
      name: profile.name ?? login,
      passwordHash: null,
      githubId: profile.providerId,
      githubUsername: login,
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

    const existingUser = await this.users.findByGitHubId(profile.providerId);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("This GitHub account is already linked to another user");
    }

    await this.users.update(userId, {
      githubId: profile.providerId,
      githubUsername: profile.username ?? "",
    });

    await this.oauthTokens.upsert({
      userId,
      provider: "github",
      accessToken: tokens.accessToken,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
      scopes: tokens.scopes,
    });
  }
}

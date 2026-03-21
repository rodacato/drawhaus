import crypto from "crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import { ForbiddenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

type GitHubUserInfo = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export class GitHubAuthUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private oauthTokens: OAuthTokenRepository,
    private siteSettings?: SiteSettingsRepository,
  ) {}

  get isEnabled(): boolean {
    return !!(config.githubClientId && config.githubClientSecret && config.githubRedirectUri);
  }

  generateStateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.githubClientId,
      redirect_uri: config.githubRedirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<{ sessionToken: string; redirectUrl: string }> {
    // 1. Exchange code for token
    const tokens = await this.exchangeCode(code);

    // 2. Fetch user info from GitHub
    const githubUser = await this.fetchUserInfo(tokens.access_token);

    // 3. Get email (may be private)
    let email = githubUser.email;
    if (!email) {
      email = await this.fetchPrimaryEmail(tokens.access_token);
    }
    if (!email) {
      throw new Error("GitHub account has no verified email address");
    }

    // 4. Resolve or create local user
    const githubIdStr = String(githubUser.id);
    let user = await this.users.findByGitHubId(githubIdStr);

    if (!user) {
      // Check if email already exists (link accounts)
      user = await this.users.findByEmail(email.toLowerCase());

      if (user) {
        // Link GitHub to existing account
        await this.users.update(user.id, {
          githubId: githubIdStr,
          githubUsername: githubUser.login,
          avatarUrl: user.avatarUrl ?? githubUser.avatar_url,
        });
        user = (await this.users.findById(user.id))!;
      } else {
        // Create new user — respect registration gate
        const userCount = await this.users.count();
        const isFirstUser = userCount === 0;

        if (!isFirstUser && this.siteSettings) {
          const settings = await this.siteSettings.get();
          if (!settings.registrationOpen) {
            throw new ForbiddenError();
          }
        }

        user = await this.users.create({
          email: email.toLowerCase(),
          name: githubUser.name ?? githubUser.login,
          passwordHash: null,
          githubId: githubIdStr,
          githubUsername: githubUser.login,
          avatarUrl: githubUser.avatar_url,
        });

        // First user becomes admin
        if (isFirstUser) {
          await this.users.adminUpdate(user.id, { role: "admin" });
          user.role = "admin";
        }
      }
    } else {
      // Update username in case it changed
      if (user.githubUsername !== githubUser.login) {
        await this.users.update(user.id, { githubUsername: githubUser.login });
      }
    }

    if (user.disabled) {
      throw new ForbiddenError();
    }

    // 5. Save OAuth tokens (GitHub tokens don't expire by default)
    await this.oauthTokens.upsert({
      userId: user.id,
      provider: "github",
      accessToken: tokens.access_token,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
      scopes: tokens.scope,
    });

    // 6. Create session
    const session = await this.sessions.create(user.id);

    return {
      sessionToken: session.token,
      redirectUrl: `${config.frontendUrl}/dashboard`,
    };
  }

  async handleLinkCallback(code: string, userId: string): Promise<void> {
    const tokens = await this.exchangeCode(code);
    const githubUser = await this.fetchUserInfo(tokens.access_token);
    const githubIdStr = String(githubUser.id);

    // Check if this GitHub account is already linked to another user
    const existingUser = await this.users.findByGitHubId(githubIdStr);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("This GitHub account is already linked to another user");
    }

    await this.users.update(userId, {
      githubId: githubIdStr,
      githubUsername: githubUser.login,
    });

    await this.oauthTokens.upsert({
      userId,
      provider: "github",
      accessToken: tokens.access_token,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
      scopes: tokens.scope,
    });
  }

  private async exchangeCode(code: string): Promise<GitHubTokenResponse> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubRedirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub token exchange failed: ${body}`);
    }

    const data = (await response.json()) as GitHubTokenResponse & { error?: string };
    if (data.error) {
      throw new Error(`GitHub token exchange failed: ${data.error}`);
    }

    return data;
  }

  private async fetchUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch GitHub user info");
    }

    return response.json() as Promise<GitHubUserInfo>;
  }

  private async fetchPrimaryEmail(accessToken: string): Promise<string | null> {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const emails = (await response.json()) as GitHubEmail[];
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? null;
  }
}

import crypto from "crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import { ForbiddenError } from "../../../domain/errors";
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
    private users: UserRepository,
    private sessions: SessionRepository,
    private oauthTokens: OAuthTokenRepository,
    private siteSettings?: SiteSettingsRepository,
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
    // 1. Exchange code for tokens
    const tokens = await this.exchangeCode(code);

    // 2. Fetch user info from Google
    const googleUser = await this.fetchUserInfo(tokens.access_token);

    // 3. Resolve or create local user
    let user = await this.users.findByGoogleId(googleUser.id);

    if (!user) {
      // Check if email already exists (link accounts)
      user = await this.users.findByEmail(googleUser.email.toLowerCase());

      if (user) {
        // Link Google to existing account
        await this.users.update(user.id, {
          googleId: googleUser.id,
          avatarUrl: user.avatarUrl ?? googleUser.picture ?? null,
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
          email: googleUser.email.toLowerCase(),
          name: googleUser.name,
          passwordHash: null,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture,
        });

        // First user becomes admin
        if (isFirstUser) {
          await this.users.adminUpdate(user.id, { role: "admin" });
          user.role = "admin";
        }
      }
    }

    if (user.disabled) {
      throw new ForbiddenError();
    }

    // 4. Save OAuth tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await this.oauthTokens.upsert({
      userId: user.id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      scopes: tokens.scope,
    });

    // 5. Create session
    const session = await this.sessions.create(user.id);

    return {
      sessionToken: session.token,
      redirectUrl: `${config.frontendUrl}/dashboard`,
    };
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

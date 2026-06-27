import type { OAuthProviderPort, OAuthTokens, OAuthProfile } from "../../domain/ports/oauth-provider";
import { config } from "../config";

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

export class GoogleOAuthProvider implements OAuthProviderPort {
  get isEnabled(): boolean {
    return !!(config.googleClientId && config.googleClientSecret && config.googleRedirectUri);
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

  async exchangeCode(code: string): Promise<OAuthTokens> {
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

    const data = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope,
    };
  }

  async fetchUserInfo(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Google user info");
    }

    const user = (await response.json()) as GoogleUserInfo;
    return {
      providerId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.picture ?? null,
    };
  }
}

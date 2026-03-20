import type { OAuthTokenRepository } from "../../domain/ports/oauth-token-repository";
import { DriveTokenError } from "../../domain/errors";
import { config } from "../config";

export class GoogleTokenRefresher {
  constructor(private oauthTokens: OAuthTokenRepository) {}

  async getValidAccessToken(userId: string): Promise<string> {
    const token = await this.oauthTokens.findByUserAndProvider(userId, "google");
    if (!token) throw new DriveTokenError();
    if (!token.refreshToken) throw new DriveTokenError("No refresh token available");

    if (!token.scopes.includes("drive.file")) {
      throw new DriveTokenError("Google Drive scope not granted. Please reconnect Google Drive.");
    }

    // Return current token if still valid (5-minute buffer)
    if (token.tokenExpiresAt && token.tokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return token.accessToken;
    }

    // Refresh the token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 400 && body.includes("invalid_grant")) {
        await this.oauthTokens.deleteByUserAndProvider(userId, "google");
        throw new DriveTokenError("Google access revoked. Please reconnect.");
      }
      throw new Error(`Token refresh failed: ${body}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.oauthTokens.upsert({
      userId,
      provider: "google",
      accessToken: data.access_token,
      refreshToken: token.refreshToken,
      tokenExpiresAt: expiresAt,
      scopes: token.scopes,
    });

    return data.access_token;
  }
}

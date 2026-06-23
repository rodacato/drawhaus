import { GoogleTokenRefresher } from "../../infrastructure/services/google-token-refresh";
import { DriveTokenError } from "../../domain/errors";

export class StubGoogleTokenRefresher extends GoogleTokenRefresher {
  tokenByUser = new Map<string, string>();

  constructor() {
    // Pass a stub OAuthTokenRepository — never reached because we override the only used method.
    super({
      findByUserAndProvider: async () => null,
      upsert: async () => ({ id: "stub", userId: "stub", provider: "google", accessToken: "stub", refreshToken: null, tokenExpiresAt: null, scopes: "", createdAt: new Date(), updatedAt: new Date() }),
      deleteByUserAndProvider: async () => undefined,
    });
  }

  setToken(userId: string, token: string): void {
    this.tokenByUser.set(userId, token);
  }

  override async getValidAccessToken(userId: string): Promise<string> {
    const token = this.tokenByUser.get(userId);
    if (!token) throw new DriveTokenError();
    return token;
  }
}

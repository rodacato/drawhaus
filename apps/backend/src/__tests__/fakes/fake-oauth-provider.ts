import type { OAuthProviderPort, OAuthTokens, OAuthProfile } from "../../domain/ports/oauth-provider";

export class FakeOAuthProvider implements OAuthProviderPort {
  isEnabled = false;
  tokens: OAuthTokens = { accessToken: "fake-access-token", scopes: "" };
  profile: OAuthProfile = { providerId: "fake-id", email: null, name: null, avatarUrl: null };

  getAuthorizationUrl(state: string): string {
    return `https://oauth.test/authorize?state=${state}`;
  }

  async exchangeCode(): Promise<OAuthTokens> {
    return this.tokens;
  }

  async fetchUserInfo(): Promise<OAuthProfile> {
    return this.profile;
  }
}

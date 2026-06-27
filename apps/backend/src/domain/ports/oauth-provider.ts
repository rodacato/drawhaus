export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes: string;
};

export type OAuthProfile = {
  providerId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  username?: string | null;
};

export interface OAuthProviderPort {
  readonly isEnabled: boolean;
  getAuthorizationUrl(state: string, scopes?: string[]): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  fetchUserInfo(accessToken: string): Promise<OAuthProfile>;
}

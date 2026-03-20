import type { OAuthToken } from "../entities/oauth-token";

export interface OAuthTokenRepository {
  upsert(data: {
    userId: string;
    provider: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    scopes: string;
  }): Promise<OAuthToken>;
  findByUserAndProvider(userId: string, provider: string): Promise<OAuthToken | null>;
  deleteByUserAndProvider(userId: string, provider: string): Promise<void>;
}

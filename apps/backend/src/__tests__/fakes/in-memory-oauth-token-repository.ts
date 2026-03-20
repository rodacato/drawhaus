import crypto from "crypto";
import type { OAuthTokenRepository } from "../../domain/ports/oauth-token-repository";
import type { OAuthToken } from "../../domain/entities/oauth-token";

export class InMemoryOAuthTokenRepository implements OAuthTokenRepository {
  store: OAuthToken[] = [];

  async upsert(data: {
    userId: string;
    provider: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    scopes: string;
  }): Promise<OAuthToken> {
    const existing = this.store.find((t) => t.userId === data.userId && t.provider === data.provider);
    if (existing) {
      existing.accessToken = data.accessToken;
      if (data.refreshToken) existing.refreshToken = data.refreshToken;
      existing.tokenExpiresAt = data.tokenExpiresAt ?? null;
      existing.scopes = data.scopes;
      existing.updatedAt = new Date();
      return existing;
    }
    const token: OAuthToken = {
      id: crypto.randomUUID(),
      userId: data.userId,
      provider: data.provider,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      scopes: data.scopes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(token);
    return token;
  }

  async findByUserAndProvider(userId: string, provider: string): Promise<OAuthToken | null> {
    return this.store.find((t) => t.userId === userId && t.provider === provider) ?? null;
  }

  async deleteByUserAndProvider(userId: string, provider: string): Promise<void> {
    this.store = this.store.filter((t) => !(t.userId === userId && t.provider === provider));
  }
}

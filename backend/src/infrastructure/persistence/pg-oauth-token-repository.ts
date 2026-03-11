import type { OAuthTokenRepository } from "../../domain/ports/oauth-token-repository";
import type { OAuthToken } from "../../domain/entities/oauth-token";
import { pool } from "../db";

type TokenRow = {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string;
  created_at: string;
  updated_at: string;
};

function toDomain(row: TokenRow): OAuthToken {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : null,
    scopes: row.scopes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PgOAuthTokenRepository implements OAuthTokenRepository {
  async upsert(data: {
    userId: string;
    provider: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    scopes: string;
  }): Promise<OAuthToken> {
    const { rows } = await pool.query<TokenRow>(
      `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_expires_at, scopes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, provider) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
         token_expires_at = EXCLUDED.token_expires_at,
         scopes = EXCLUDED.scopes,
         updated_at = now()
       RETURNING *`,
      [
        data.userId,
        data.provider,
        data.accessToken,
        data.refreshToken ?? null,
        data.tokenExpiresAt?.toISOString() ?? null,
        data.scopes,
      ],
    );
    return toDomain(rows[0]);
  }

  async findByUserAndProvider(userId: string, provider: string): Promise<OAuthToken | null> {
    const { rows } = await pool.query<TokenRow>(
      `SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2 LIMIT 1`,
      [userId, provider],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async deleteByUserAndProvider(userId: string, provider: string): Promise<void> {
    await pool.query(
      `DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2`,
      [userId, provider],
    );
  }
}

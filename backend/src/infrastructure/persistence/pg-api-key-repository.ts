import type { ApiKeyRepository } from "../../domain/ports/api-key-repository";
import type { ApiKey } from "../../domain/entities/api-key";
import { pool } from "../db";
import { logger } from "../logger";

type ApiKeyRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

const SELECT_COLS = "id, user_id, workspace_id, name, key_prefix, key_hash, expires_at, revoked_at, last_used_at, created_at";

function toDomain(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keyHash: row.key_hash,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export class PgApiKeyRepository implements ApiKeyRepository {
  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const { rows } = await pool.query<ApiKeyRow>(
      `SELECT ${SELECT_COLS} FROM api_keys WHERE key_hash = $1 LIMIT 1`,
      [keyHash],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const { rows } = await pool.query<ApiKeyRow>(
      `SELECT ${SELECT_COLS} FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<ApiKey | null> {
    const { rows } = await pool.query<ApiKeyRow>(
      `SELECT ${SELECT_COLS} FROM api_keys WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(data: {
    userId: string;
    workspaceId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    expiresAt: Date | null;
  }): Promise<ApiKey> {
    const { rows } = await pool.query<ApiKeyRow>(
      `INSERT INTO api_keys (user_id, workspace_id, name, key_prefix, key_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLS}`,
      [data.userId, data.workspaceId, data.name, data.keyPrefix, data.keyHash, data.expiresAt],
    );
    return toDomain(rows[0]);
  }

  async revoke(id: string): Promise<void> {
    await pool.query(
      `UPDATE api_keys SET revoked_at = now() WHERE id = $1`,
      [id],
    );
  }

  async updateLastUsed(id: string): Promise<void> {
    // Debounced: only update if last_used_at is null or older than 1 minute
    await pool.query(
      `UPDATE api_keys SET last_used_at = now()
       WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
      [id],
    );
  }

  async countActiveByUser(userId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM api_keys
       WHERE user_id = $1 AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())`,
      [userId],
    );
    return parseInt(rows[0].count, 10);
  }

  logRequest(data: {
    keyId: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string | null;
    userAgent: string | null;
  }): void {
    // Fire-and-forget: don't block the response
    pool.query(
      `INSERT INTO api_request_logs (key_id, method, path, status_code, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.keyId, data.method, data.path, data.statusCode, data.ip, data.userAgent],
    ).catch((err) => {
      logger.warn({ err }, "Failed to log API request");
    });
  }
}

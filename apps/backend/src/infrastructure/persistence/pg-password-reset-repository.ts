import type { PasswordResetRepository } from "../../domain/ports/password-reset-repository";
import type { PasswordResetToken } from "../../domain/entities/password-reset-token";
import { pool } from "../db";

type ResetRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function toDomain(row: ResetRow): PasswordResetToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

const COLUMNS = "id, user_id, token, expires_at, used_at, created_at";

export class PgPasswordResetRepository implements PasswordResetRepository {
  async create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordResetToken> {
    const { rows } = await pool.query<ResetRow>(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING ${COLUMNS}`,
      [data.userId, data.token, data.expiresAt.toISOString()],
    );
    return toDomain(rows[0]);
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const { rows } = await pool.query<ResetRow>(
      `SELECT ${COLUMNS} FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
      [token],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markUsed(id: string): Promise<void> {
    await pool.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [id]);
  }
}

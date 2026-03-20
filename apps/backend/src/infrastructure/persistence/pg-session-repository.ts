import crypto from "crypto";
import type { SessionRepository, AuthUser } from "../../domain/ports/session-repository";
import type { Session } from "../../domain/entities/session";
import type { UserRole } from "../../domain/entities/user";
import { pool } from "../db";
import { config } from "../config";

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  avatar_url: string | null;
  password_hash: string | null;
};

export class PgSessionRepository implements SessionRepository {
  async create(userId: string): Promise<Session> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.sessionTtlDays);

    await pool.query(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
      [token, userId, expiresAt.toISOString()],
    );

    return { token, userId, expiresAt };
  }

  async findUserByToken(token: string): Promise<AuthUser | null> {
    const { rows } = await pool.query<SessionRow>(
      `SELECT s.id, s.user_id, s.expires_at, u.email, u.name, u.role, u.disabled, u.avatar_url, u.password_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
       LIMIT 1`,
      [token],
    );

    const row = rows[0];
    if (!row) return null;

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await this.delete(token);
      return null;
    }

    return {
      id: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      disabled: row.disabled,
      avatarUrl: row.avatar_url,
      hasPassword: !!row.password_hash,
    };
  }

  async delete(token: string): Promise<void> {
    await pool.query("DELETE FROM sessions WHERE id = $1", [token]);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  }
}

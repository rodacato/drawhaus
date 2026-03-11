import type { UserRepository } from "../../domain/ports/user-repository";
import type { User, UserRole } from "../../domain/entities/user";
import { pool } from "../db";

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  role: string;
  disabled: boolean;
  google_id: string | null;
  avatar_url: string | null;
  created_at: string;
};

const SELECT_COLS = "id, email, name, password_hash, role, disabled, google_id, avatar_url, created_at";

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    disabled: row.disabled,
    googleId: row.google_id,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
  };
}

export class PgUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<UserRow>(
      `SELECT ${SELECT_COLS} FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<UserRow>(
      `SELECT ${SELECT_COLS} FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const { rows } = await pool.query<UserRow>(
      `SELECT ${SELECT_COLS} FROM users WHERE google_id = $1 LIMIT 1`,
      [googleId],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(data: { email: string; name: string; passwordHash: string | null; googleId?: string; avatarUrl?: string }): Promise<User> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (email, name, password_hash, google_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLS}`,
      [data.email, data.name, data.passwordHash, data.googleId ?? null, data.avatarUrl ?? null],
    );
    return toDomain(rows[0]);
  }

  async update(id: string, data: Partial<Pick<User, "email" | "name" | "passwordHash" | "googleId" | "avatarUrl">>): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${index}`);
      values.push(data.email);
      index += 1;
    }
    if (data.name !== undefined) {
      updates.push(`name = $${index}`);
      values.push(data.name);
      index += 1;
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${index}`);
      values.push(data.passwordHash);
      index += 1;
    }
    if (data.googleId !== undefined) {
      updates.push(`google_id = $${index}`);
      values.push(data.googleId);
      index += 1;
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${index}`);
      values.push(data.avatarUrl);
      index += 1;
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<UserRow>(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${index}
       RETURNING ${SELECT_COLS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async count(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>("SELECT count(*) FROM users");
    return parseInt(rows[0].count, 10);
  }

  async listAll(): Promise<Omit<User, "passwordHash">[]> {
    const { rows } = await pool.query<UserRow>(
      `SELECT ${SELECT_COLS} FROM users ORDER BY created_at ASC`,
    );
    return rows.map((row) => {
      const { passwordHash: _passwordHash, ...rest } = toDomain(row);
      return rest;
    });
  }

  async adminUpdate(id: string, data: { role?: UserRole; disabled?: boolean }): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.role !== undefined) {
      updates.push(`role = $${index}`);
      values.push(data.role);
      index += 1;
    }
    if (data.disabled !== undefined) {
      updates.push(`disabled = $${index}`);
      values.push(data.disabled);
      index += 1;
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<UserRow>(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${index}
       RETURNING ${SELECT_COLS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}

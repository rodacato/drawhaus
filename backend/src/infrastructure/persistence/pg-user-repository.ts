import type { UserRepository } from "../../domain/ports/user-repository";
import type { User } from "../../domain/entities/user";
import { pool } from "../db";

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
  };
}

export class PgUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<UserRow>(
      "SELECT id, email, name, password_hash, created_at FROM users WHERE id = $1 LIMIT 1",
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<UserRow>(
      "SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(data: { email: string; name: string; passwordHash: string }): Promise<User> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, password_hash, created_at`,
      [data.email, data.name, data.passwordHash],
    );
    return toDomain(rows[0]);
  }
}

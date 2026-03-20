import type { InvitationRepository } from "../../domain/ports/invitation-repository";
import type { Invitation } from "../../domain/entities/invitation";
import type { UserRole } from "../../domain/entities/user";
import { pool } from "../db";

type InvitationRow = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function toDomain(row: InvitationRow): Invitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    token: row.token,
    invitedBy: row.invited_by,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

const COLUMNS = "id, email, role, token, invited_by, expires_at, used_at, created_at";

export class PgInvitationRepository implements InvitationRepository {
  async create(data: { email: string; role: UserRole; token: string; invitedBy: string; expiresAt: Date }): Promise<Invitation> {
    const { rows } = await pool.query<InvitationRow>(
      `INSERT INTO invitations (email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [data.email, data.role, data.token, data.invitedBy, data.expiresAt.toISOString()],
    );
    return toDomain(rows[0]);
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const { rows } = await pool.query<InvitationRow>(
      `SELECT ${COLUMNS} FROM invitations WHERE token = $1 LIMIT 1`,
      [token],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markUsed(id: string): Promise<void> {
    await pool.query("UPDATE invitations SET used_at = now() WHERE id = $1", [id]);
  }

  async listPending(): Promise<Invitation[]> {
    const { rows } = await pool.query<InvitationRow>(
      `SELECT ${COLUMNS} FROM invitations WHERE used_at IS NULL ORDER BY created_at DESC`,
    );
    return rows.map(toDomain);
  }
}

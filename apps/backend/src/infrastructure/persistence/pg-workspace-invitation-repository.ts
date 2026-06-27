import type { WorkspaceInvitationRepository } from "../../domain/ports/workspace-invitation-repository";
import type { WorkspaceInvitation } from "../../domain/entities/workspace-invitation";
import type { WorkspaceRole } from "../../domain/entities/workspace";
import { pool } from "../db";

type WorkspaceInvitationRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function toDomain(row: WorkspaceInvitationRow): WorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    token: row.token,
    invitedBy: row.invited_by,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

const COLUMNS = "id, workspace_id, email, role, token, invited_by, expires_at, used_at, created_at";

export class PgWorkspaceInvitationRepository implements WorkspaceInvitationRepository {
  async create(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<WorkspaceInvitation> {
    const { rows } = await pool.query<WorkspaceInvitationRow>(
      `INSERT INTO workspace_invitations (workspace_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [data.workspaceId, data.email, data.role, data.token, data.invitedBy, data.expiresAt.toISOString()],
    );
    return toDomain(rows[0]);
  }

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const { rows } = await pool.query<WorkspaceInvitationRow>(
      `SELECT ${COLUMNS} FROM workspace_invitations WHERE token = $1 LIMIT 1`,
      [token],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markUsed(id: string): Promise<void> {
    await pool.query("UPDATE workspace_invitations SET used_at = now() WHERE id = $1", [id]);
  }
}

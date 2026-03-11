import type { WorkspaceRepository } from "../../domain/ports/workspace-repository";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "../../domain/entities/workspace";
import { pool } from "../db";

type WorkspaceRow = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  is_personal: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  added_at: string;
  user_name: string;
  user_email: string;
};

function toDomain(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    isPersonal: row.is_personal,
    color: row.color,
    icon: row.icon,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const COLS = "id, name, description, owner_id, is_personal, color, icon, created_at, updated_at";

export class PgWorkspaceRepository implements WorkspaceRepository {
  async findById(id: string): Promise<Workspace | null> {
    const { rows } = await pool.query<WorkspaceRow>(
      `SELECT ${COLS} FROM workspaces WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    const { rows } = await pool.query<WorkspaceRow>(
      `SELECT DISTINCT ${COLS.split(", ").map((c) => `w.${c}`).join(", ")}
       FROM workspaces w
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE w.owner_id = $1 OR wm.user_id = $1
       ORDER BY w.is_personal DESC, w.name ASC`,
      [userId],
    );
    return rows.map(toDomain);
  }

  async findPersonal(userId: string): Promise<Workspace | null> {
    const { rows } = await pool.query<WorkspaceRow>(
      `SELECT ${COLS} FROM workspaces WHERE owner_id = $1 AND is_personal = true LIMIT 1`,
      [userId],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(data: { name: string; description?: string; ownerId: string; isPersonal?: boolean; color?: string; icon?: string }): Promise<Workspace> {
    const { rows } = await pool.query<WorkspaceRow>(
      `INSERT INTO workspaces (name, description, owner_id, is_personal, color, icon)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLS}`,
      [data.name, data.description ?? "", data.ownerId, data.isPersonal ?? false, data.color ?? "#6366f1", data.icon ?? ""],
    );
    const workspace = toDomain(rows[0]);

    // Auto-add owner as admin member
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [workspace.id, data.ownerId],
    );

    return workspace;
  }

  async update(id: string, data: Partial<Pick<Workspace, "name" | "description" | "color" | "icon">>): Promise<Workspace | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.name !== undefined) { updates.push(`name = $${index}`); values.push(data.name); index += 1; }
    if (data.description !== undefined) { updates.push(`description = $${index}`); values.push(data.description); index += 1; }
    if (data.color !== undefined) { updates.push(`color = $${index}`); values.push(data.color); index += 1; }
    if (data.icon !== undefined) { updates.push(`icon = $${index}`); values.push(data.icon); index += 1; }

    if (updates.length === 0) return this.findById(id);

    updates.push("updated_at = now()");
    values.push(id);

    const { rows } = await pool.query<WorkspaceRow>(
      `UPDATE workspaces SET ${updates.join(", ")} WHERE id = $${index} RETURNING ${COLS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    // Diagrams and folders get workspace_id = NULL (ON DELETE SET NULL)
    await pool.query("DELETE FROM workspaces WHERE id = $1", [id]);
  }

  async findMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const { rows } = await pool.query<{ role: WorkspaceRole }>(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 LIMIT 1`,
      [workspaceId, userId],
    );
    return rows[0]?.role ?? null;
  }

  async findMembers(workspaceId: string): Promise<(WorkspaceMember & { userName: string; userEmail: string })[]> {
    const { rows } = await pool.query<MemberRow>(
      `SELECT wm.workspace_id, wm.user_id, wm.role, wm.added_at, u.name AS user_name, u.email AS user_email
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.added_at ASC`,
      [workspaceId],
    );
    return rows.map((r) => ({
      workspaceId: r.workspace_id,
      userId: r.user_id,
      role: r.role,
      addedAt: new Date(r.added_at),
      userName: r.user_name,
      userEmail: r.user_email,
    }));
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3`,
      [workspaceId, userId, role],
    );
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    await pool.query(
      `UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3`,
      [role, workspaceId, userId],
    );
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await pool.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );
  }

  async countByOwner(userId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM workspaces WHERE owner_id = $1 AND is_personal = false`,
      [userId],
    );
    return parseInt(rows[0].count, 10);
  }

  async countMembers(workspaceId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = $1`,
      [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }
}

import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { WorkspaceRole } from "../../../domain/entities/workspace";
import { NotFoundError, ExpiredError } from "../../../domain/errors";
import { pool } from "../../../infrastructure/db";

type InviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  expires_at: string;
  used_at: string | null;
};

export class AcceptWorkspaceInviteUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(token: string, userId: string) {
    const { rows } = await pool.query<InviteRow>(
      `SELECT id, workspace_id, email, role, expires_at, used_at
       FROM workspace_invitations WHERE token = $1 LIMIT 1`,
      [token],
    );
    if (!rows[0]) throw new NotFoundError("Invitation");

    const invite = rows[0];
    if (invite.used_at) throw new NotFoundError("Invitation");
    if (new Date(invite.expires_at) < new Date()) throw new ExpiredError("Invitation");

    const workspace = await this.workspaces.findById(invite.workspace_id);
    if (!workspace) throw new NotFoundError("Workspace");

    // Mark invitation as used
    await pool.query(
      `UPDATE workspace_invitations SET used_at = now() WHERE id = $1`,
      [invite.id],
    );

    // Add user as member
    await this.workspaces.addMember(invite.workspace_id, userId, invite.role);

    return { workspace, role: invite.role };
  }
}

import crypto from "crypto";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { EmailService } from "../../../domain/ports/email-service";
import type { WorkspaceRole } from "../../../domain/entities/workspace";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import { pool } from "../../../infrastructure/db";

export class InviteToWorkspaceUseCase {
  constructor(
    private workspaces: WorkspaceRepository,
    private settings: SiteSettingsRepository,
    private emailService: EmailService,
  ) {}

  async execute(input: { workspaceId: string; actorId: string; actorName: string; email: string; role: WorkspaceRole }) {
    const workspace = await this.workspaces.findById(input.workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");
    if (workspace.isPersonal) throw new ForbiddenError();

    const actorRole = await this.workspaces.findMemberRole(input.workspaceId, input.actorId);
    if (actorRole !== "admin") throw new ForbiddenError();

    // Check member limit
    const siteSettings = await this.settings.get();
    const count = await this.workspaces.countMembers(input.workspaceId);
    if (count >= siteSettings.maxMembersPerWorkspace) {
      throw new ForbiddenError();
    }

    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO workspace_invitations (workspace_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.workspaceId, input.email, input.role, token, input.actorId, expiresAt],
    );

    await this.emailService.sendWorkspaceInviteEmail(input.email, token, input.actorName, workspace.name);

    return { token, email: input.email, role: input.role, expiresAt };
  }
}

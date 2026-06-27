import crypto from "node:crypto";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { WorkspaceInvitationRepository } from "../../../domain/ports/workspace-invitation-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { EmailService } from "../../../domain/ports/email-service";
import type { WorkspaceRole } from "../../../domain/entities/workspace";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class InviteToWorkspaceUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly invitations: WorkspaceInvitationRepository,
    private readonly settings: SiteSettingsRepository,
    private readonly emailService: EmailService,
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

    await this.invitations.create({
      workspaceId: input.workspaceId,
      email: input.email,
      role: input.role,
      token,
      invitedBy: input.actorId,
      expiresAt,
    });

    await this.emailService.sendWorkspaceInviteEmail(input.email, token, input.actorName, workspace.name);

    return { token, email: input.email, role: input.role, expiresAt };
  }
}

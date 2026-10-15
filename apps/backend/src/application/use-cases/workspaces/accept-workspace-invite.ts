import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { WorkspaceInvitationRepository } from "../../../domain/ports/workspace-invitation-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { WorkspaceRole } from "../../../domain/entities/workspace";
import { NotFoundError, ExpiredError, ForbiddenError } from "../../../domain/errors";

const ROLE_RANK: Record<WorkspaceRole, number> = { viewer: 0, editor: 1, admin: 2 };

export class AcceptWorkspaceInviteUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly invitations: WorkspaceInvitationRepository,
    private readonly settings: SiteSettingsRepository,
  ) {}

  async execute(token: string, userId: string) {
    const invite = await this.invitations.findByToken(token);
    if (!invite) throw new NotFoundError("Invitation");
    if (invite.usedAt) throw new NotFoundError("Invitation");
    if (invite.expiresAt < new Date()) throw new ExpiredError("Invitation");

    const workspace = await this.workspaces.findById(invite.workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");

    const currentRole = await this.workspaces.findMemberRole(invite.workspaceId, userId);
    if (!currentRole) {
      const { maxMembersPerWorkspace } = await this.settings.get();
      const count = await this.workspaces.countMembers(invite.workspaceId);
      if (count >= maxMembersPerWorkspace) throw new ForbiddenError();
    }

    const claimed = await this.invitations.markUsed(invite.id);
    if (!claimed) throw new NotFoundError("Invitation");

    const keepsCurrentRole =
      currentRole !== null &&
      (userId === workspace.ownerId || ROLE_RANK[currentRole] >= ROLE_RANK[invite.role]);
    const role = keepsCurrentRole ? currentRole : invite.role;
    if (role !== currentRole) {
      await this.workspaces.addMember(invite.workspaceId, userId, role);
    }

    return { workspace, role };
  }
}

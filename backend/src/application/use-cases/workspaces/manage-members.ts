import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { WorkspaceRole } from "../../../domain/entities/workspace";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class AddWorkspaceMemberUseCase {
  constructor(
    private workspaces: WorkspaceRepository,
    private settings: SiteSettingsRepository,
  ) {}

  async execute(workspaceId: string, actorId: string, targetUserId: string, role: WorkspaceRole) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");
    if (workspace.isPersonal) throw new ForbiddenError();

    const actorRole = await this.workspaces.findMemberRole(workspaceId, actorId);
    if (actorRole !== "admin") throw new ForbiddenError();

    const siteSettings = await this.settings.get();
    const count = await this.workspaces.countMembers(workspaceId);
    if (count >= siteSettings.maxMembersPerWorkspace) {
      throw new ForbiddenError();
    }

    await this.workspaces.addMember(workspaceId, targetUserId, role);
  }
}

export class UpdateWorkspaceMemberRoleUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(workspaceId: string, actorId: string, targetUserId: string, role: WorkspaceRole) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");

    const actorRole = await this.workspaces.findMemberRole(workspaceId, actorId);
    if (actorRole !== "admin") throw new ForbiddenError();

    // Can't change owner's role
    if (targetUserId === workspace.ownerId) throw new ForbiddenError();

    await this.workspaces.updateMemberRole(workspaceId, targetUserId, role);
  }
}

export class RemoveWorkspaceMemberUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(workspaceId: string, actorId: string, targetUserId: string) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");

    // Owner can't be removed
    if (targetUserId === workspace.ownerId) throw new ForbiddenError();

    // Admin can remove anyone; members can remove themselves (leave)
    if (actorId !== targetUserId) {
      const actorRole = await this.workspaces.findMemberRole(workspaceId, actorId);
      if (actorRole !== "admin") throw new ForbiddenError();
    }

    await this.workspaces.removeMember(workspaceId, targetUserId);
  }
}

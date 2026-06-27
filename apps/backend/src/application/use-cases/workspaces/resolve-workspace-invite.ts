import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { WorkspaceInvitationRepository } from "../../../domain/ports/workspace-invitation-repository";
import type { WorkspaceRole } from "../../../domain/entities/workspace";
import { NotFoundError, ExpiredError } from "../../../domain/errors";

export class ResolveWorkspaceInviteUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly invitations: WorkspaceInvitationRepository,
  ) {}

  async execute(token: string): Promise<{ workspaceName: string; role: WorkspaceRole; email: string }> {
    const invite = await this.invitations.findByToken(token);
    if (!invite || invite.usedAt) throw new NotFoundError("Invitation");
    if (invite.expiresAt < new Date()) throw new ExpiredError("Invitation");

    const workspace = await this.workspaces.findById(invite.workspaceId);
    if (!workspace) throw new NotFoundError("Invitation");

    return { workspaceName: workspace.name, role: invite.role, email: invite.email };
  }
}

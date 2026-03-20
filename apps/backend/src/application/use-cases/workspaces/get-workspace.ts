import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class GetWorkspaceUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(workspaceId: string, userId: string) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");

    const role = await this.workspaces.findMemberRole(workspaceId, userId);
    if (!role) throw new ForbiddenError();

    const members = await this.workspaces.findMembers(workspaceId);
    return { workspace, role, members };
  }
}

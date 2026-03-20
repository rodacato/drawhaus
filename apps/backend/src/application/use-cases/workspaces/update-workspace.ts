import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class UpdateWorkspaceUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(workspaceId: string, userId: string, data: { name?: string; description?: string; color?: string; icon?: string }) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");

    const role = await this.workspaces.findMemberRole(workspaceId, userId);
    if (role !== "admin") throw new ForbiddenError();

    return this.workspaces.update(workspaceId, data);
  }
}

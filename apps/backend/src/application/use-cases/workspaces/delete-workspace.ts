import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class DeleteWorkspaceUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(workspaceId: string, userId: string) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");
    if (workspace.isPersonal) throw new ForbiddenError();
    if (workspace.ownerId !== userId) throw new ForbiddenError();

    await this.workspaces.delete(workspaceId);
  }
}

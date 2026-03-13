import type { FolderRepository } from "../../../domain/ports/folder-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { ForbiddenError } from "../../../domain/errors";

export class CreateFolderUseCase {
  constructor(private folders: FolderRepository, private workspaces: WorkspaceRepository) {}

  async execute(userId: string, name: string, workspaceId?: string | null) {
    if (workspaceId) {
      const role = await this.workspaces.findMemberRole(workspaceId, userId);
      if (!role) throw new ForbiddenError();
    }
    return this.folders.create({ ownerId: userId, workspaceId, name });
  }
}

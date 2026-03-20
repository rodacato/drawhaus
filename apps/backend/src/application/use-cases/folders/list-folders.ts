import type { FolderRepository } from "../../../domain/ports/folder-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { ForbiddenError } from "../../../domain/errors";

export class ListFoldersUseCase {
  constructor(private folders: FolderRepository, private workspaces: WorkspaceRepository) {}

  async execute(userId: string, workspaceId?: string) {
    if (workspaceId) {
      const role = await this.workspaces.findMemberRole(workspaceId, userId);
      if (!role) throw new ForbiddenError();
      return this.folders.findByWorkspace(workspaceId);
    }
    return this.folders.findByUser(userId);
  }
}

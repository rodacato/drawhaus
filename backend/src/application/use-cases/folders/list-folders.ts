import type { FolderRepository } from "../../../domain/ports/folder-repository";

export class ListFoldersUseCase {
  constructor(private folders: FolderRepository) {}

  async execute(userId: string, workspaceId?: string) {
    if (workspaceId) return this.folders.findByWorkspace(workspaceId);
    return this.folders.findByUser(userId);
  }
}

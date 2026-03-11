import type { FolderRepository } from "../../../domain/ports/folder-repository";

export class CreateFolderUseCase {
  constructor(private folders: FolderRepository) {}

  async execute(userId: string, name: string, workspaceId?: string | null) {
    return this.folders.create({ ownerId: userId, workspaceId, name });
  }
}

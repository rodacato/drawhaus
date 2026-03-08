import type { FolderRepository } from "../../../domain/ports/folder-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class DeleteFolderUseCase {
  constructor(private folders: FolderRepository) {}

  async execute(folderId: string, userId: string) {
    const folder = await this.folders.findById(folderId);
    if (!folder) throw new NotFoundError("Folder");
    if (folder.ownerId !== userId) throw new ForbiddenError();
    await this.folders.delete(folderId);
  }
}

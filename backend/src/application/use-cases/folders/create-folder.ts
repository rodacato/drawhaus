import type { FolderRepository } from "../../../domain/ports/folder-repository";

export class CreateFolderUseCase {
  constructor(private folders: FolderRepository) {}

  async execute(userId: string, name: string) {
    return this.folders.create({ ownerId: userId, name });
  }
}

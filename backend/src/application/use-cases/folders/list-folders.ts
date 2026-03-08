import type { FolderRepository } from "../../../domain/ports/folder-repository";

export class ListFoldersUseCase {
  constructor(private folders: FolderRepository) {}

  async execute(userId: string) {
    return this.folders.findByUser(userId);
  }
}

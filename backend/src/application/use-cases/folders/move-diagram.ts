import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class MoveDiagramUseCase {
  constructor(
    private diagrams: DiagramRepository,
    private folders: FolderRepository,
  ) {}

  async execute(diagramId: string, userId: string, folderId: string | null) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    if (role !== "owner") throw new ForbiddenError();

    if (folderId !== null) {
      const folder = await this.folders.findById(folderId);
      if (!folder) throw new NotFoundError("Folder");
      if (folder.ownerId !== userId) throw new ForbiddenError();
    }

    await this.diagrams.moveTo(diagramId, folderId);
  }
}

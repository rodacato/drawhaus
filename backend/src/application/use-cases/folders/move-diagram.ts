import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import { requireOwnerAccess } from "../../helpers/require-access";

export class MoveDiagramUseCase {
  constructor(
    private diagrams: DiagramRepository,
    private folders: FolderRepository,
  ) {}

  async execute(diagramId: string, userId: string, folderId: string | null) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireOwnerAccess(role);

    if (folderId !== null) {
      const folder = await this.folders.findById(folderId);
      if (!folder) throw new NotFoundError("Folder");
      if (folder.ownerId !== userId) throw new ForbiddenError();
    }

    await this.diagrams.moveTo(diagramId, folderId);
  }
}

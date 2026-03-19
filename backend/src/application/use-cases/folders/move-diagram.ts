import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import { requireOwnerAccess } from "../../helpers/require-access";

export class MoveDiagramUseCase {
  constructor(
    private diagrams: DiagramRepository,
    private folders: FolderRepository,
    private workspaces?: WorkspaceRepository,
  ) {}

  async execute(diagramId: string, userId: string, folderId: string | null, workspaceId?: string) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireOwnerAccess(role);

    // If moving to a different workspace, update workspace and reset folder
    if (workspaceId !== undefined) {
      if (this.workspaces) {
        const workspace = await this.workspaces.findById(workspaceId);
        if (!workspace) throw new NotFoundError("Workspace");
        const role = await this.workspaces.findMemberRole(workspaceId, userId);
        if (!role) throw new ForbiddenError();
      }
      await this.diagrams.moveToWorkspace(diagramId, workspaceId);
      return;
    }

    if (folderId !== null) {
      const folder = await this.folders.findById(folderId);
      if (!folder) throw new NotFoundError("Folder");
      if (folder.ownerId !== userId) throw new ForbiddenError();
    }

    await this.diagrams.moveTo(diagramId, folderId);
  }
}

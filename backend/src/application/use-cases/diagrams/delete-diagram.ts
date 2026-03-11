import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class DeleteDiagramUseCase {
  constructor(
    private diagrams: DiagramRepository,
    private workspaces?: WorkspaceRepository,
  ) {}

  async execute(diagramId: string, userId: string) {
    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    // Owner can always delete
    if (diagram.ownerId === userId) {
      await this.diagrams.delete(diagramId);
      return;
    }

    // Workspace admin can delete diagrams in their workspace
    if (diagram.workspaceId && this.workspaces) {
      const wsRole = await this.workspaces.findMemberRole(diagram.workspaceId, userId);
      if (wsRole === "admin") {
        await this.diagrams.delete(diagramId);
        return;
      }
    }

    throw new ForbiddenError();
  }
}

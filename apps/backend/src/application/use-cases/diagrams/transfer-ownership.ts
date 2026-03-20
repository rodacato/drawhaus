import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class TransferDiagramOwnershipUseCase {
  constructor(
    private diagrams: DiagramRepository,
    private workspaces: WorkspaceRepository,
    private audit: AuditLogger,
  ) {}

  async execute(diagramIds: string[], actorId: string, newOwnerId: string) {
    if (newOwnerId === actorId) throw new ForbiddenError();

    for (const id of diagramIds) {
      const diagram = await this.diagrams.findById(id);
      if (!diagram) throw new NotFoundError("Diagram");
      if (diagram.ownerId !== actorId) throw new ForbiddenError();

      // If diagram belongs to a workspace, new owner must be a member
      if (diagram.workspaceId) {
        const role = await this.workspaces.findMemberRole(diagram.workspaceId, newOwnerId);
        if (!role) throw new ForbiddenError();
      }
    }

    await this.diagrams.transferBulkOwnership(diagramIds, newOwnerId);

    this.audit.log({
      actor: actorId,
      action: "diagram.transfer_ownership",
      target: newOwnerId,
      meta: { diagramIds },
    });
  }
}

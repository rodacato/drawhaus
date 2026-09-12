import type { Diagram } from "../../../domain/entities/diagram";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { WebhookDispatcher } from "../../../domain/ports/webhook-dispatcher";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import { diagramEventData } from "../../helpers/webhook-payloads";

export class DeleteDiagramUseCase {
  constructor(
    private readonly diagrams: DiagramRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly webhooks?: WebhookDispatcher,
  ) {}

  async execute(diagramId: string, userId: string) {
    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    // Owner can always delete
    if (diagram.ownerId === userId) {
      await this.diagrams.delete(diagramId);
      this.emitDeleted(diagram, userId);
      return;
    }

    // Workspace admin can delete diagrams in their workspace
    if (diagram.workspaceId) {
      const wsRole = await this.workspaces.findMemberRole(diagram.workspaceId, userId);
      if (wsRole === "admin") {
        await this.diagrams.delete(diagramId);
        this.emitDeleted(diagram, userId);
        return;
      }
    }

    throw new ForbiddenError();
  }

  private emitDeleted(diagram: Diagram, userId: string): void {
    this.webhooks?.dispatch({
      event: "diagram.deleted",
      actorId: userId,
      data: diagramEventData(diagram),
    });
  }
}

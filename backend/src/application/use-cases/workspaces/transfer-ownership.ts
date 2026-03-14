import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class TransferWorkspaceOwnershipUseCase {
  constructor(
    private workspaces: WorkspaceRepository,
    private diagrams: DiagramRepository,
    private templates: TemplateRepository,
    private audit: AuditLogger,
  ) {}

  async execute(workspaceId: string, actorId: string, newOwnerId: string, transferResources = false) {
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace");
    if (workspace.isPersonal) throw new ForbiddenError();
    if (workspace.ownerId !== actorId) throw new ForbiddenError();
    if (newOwnerId === actorId) throw new ForbiddenError();

    // New owner must be an admin of the workspace
    const newOwnerRole = await this.workspaces.findMemberRole(workspaceId, newOwnerId);
    if (newOwnerRole !== "admin") throw new ForbiddenError();

    await this.workspaces.transferOwnership(workspaceId, newOwnerId);

    let diagramCount = 0;
    let templateCount = 0;

    if (transferResources) {
      const diagrams = await this.diagrams.findByOwnerInWorkspace(actorId, workspaceId);
      if (diagrams.length > 0) {
        await this.diagrams.transferBulkOwnership(diagrams.map((d) => d.id), newOwnerId);
        diagramCount = diagrams.length;
      }

      const templates = await this.templates.findByCreatorInWorkspace(actorId, workspaceId);
      const transferable = templates.filter((t) => !t.isBuiltIn);
      if (transferable.length > 0) {
        await this.templates.transferBulkOwnership(transferable.map((t) => t.id), newOwnerId);
        templateCount = transferable.length;
      }
    }

    this.audit.log({
      actor: actorId,
      action: "workspace.transfer_ownership",
      target: newOwnerId,
      meta: { workspaceId, transferResources, diagramCount, templateCount },
    });

    return { diagramCount, templateCount };
  }
}

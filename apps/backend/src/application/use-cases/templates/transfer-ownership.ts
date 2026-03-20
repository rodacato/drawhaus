import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class TransferTemplateOwnershipUseCase {
  constructor(
    private templates: TemplateRepository,
    private workspaces: WorkspaceRepository,
    private audit: AuditLogger,
  ) {}

  async execute(templateIds: string[], actorId: string, newCreatorId: string) {
    if (newCreatorId === actorId) throw new ForbiddenError();

    for (const id of templateIds) {
      const template = await this.templates.findById(id);
      if (!template) throw new NotFoundError("Template");
      if (template.creatorId !== actorId) throw new ForbiddenError();
      if (template.isBuiltIn) throw new ForbiddenError();

      // If template belongs to a workspace, new creator must be a member
      if (template.workspaceId) {
        const role = await this.workspaces.findMemberRole(template.workspaceId, newCreatorId);
        if (!role) throw new ForbiddenError();
      }
    }

    await this.templates.transferBulkOwnership(templateIds, newCreatorId);

    this.audit.log({
      actor: actorId,
      action: "template.transfer_ownership",
      target: newCreatorId,
      meta: { templateIds },
    });
  }
}

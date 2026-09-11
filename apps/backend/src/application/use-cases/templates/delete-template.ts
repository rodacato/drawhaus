import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { ForbiddenError } from "../../../domain/errors";
import { findReadableTemplate } from "../../helpers/find-readable-template";

export class DeleteTemplateUseCase {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  async execute(id: string, userId: string) {
    const template = await findReadableTemplate(
      { templates: this.templates, workspaces: this.workspaces },
      id,
      userId,
    );
    if (template.isBuiltIn || template.creatorId !== userId) throw new ForbiddenError();
    await this.templates.delete(id);
  }
}

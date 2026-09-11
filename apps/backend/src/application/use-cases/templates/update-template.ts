import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import { findReadableTemplate } from "../../helpers/find-readable-template";

export class UpdateTemplateUseCase {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
    data: { title?: string; description?: string; category?: string; thumbnail?: string },
  ) {
    const template = await findReadableTemplate(
      { templates: this.templates, workspaces: this.workspaces },
      id,
      userId,
    );
    if (template.isBuiltIn || template.creatorId !== userId) throw new ForbiddenError();
    const updated = await this.templates.update(id, data);
    if (!updated) throw new NotFoundError("Template");
    return updated;
  }
}

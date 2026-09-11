import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { findReadableTemplate } from "../../helpers/find-readable-template";

export class GetTemplateUseCase {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  async execute(id: string, userId: string) {
    return findReadableTemplate(
      { templates: this.templates, workspaces: this.workspaces },
      id,
      userId,
    );
  }
}

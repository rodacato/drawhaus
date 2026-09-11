import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import { requireWorkspaceAccess } from "../../helpers/require-placement";

export class ListTemplatesUseCase {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  async executeAll() {
    return this.templates.findAll();
  }

  async executeMine(userId: string) {
    return this.templates.findByCreator(userId);
  }

  async executeByWorkspace(workspaceId: string, userId: string) {
    await requireWorkspaceAccess(this.workspaces, { userId, workspaceId });
    return this.templates.findByWorkspace(workspaceId);
  }
}

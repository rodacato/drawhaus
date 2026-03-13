import type { TemplateRepository } from "../../../domain/ports/template-repository";

export class ListTemplatesUseCase {
  constructor(private templates: TemplateRepository) {}

  async executeAll() {
    return this.templates.findAll();
  }

  async executeMine(userId: string) {
    return this.templates.findByCreator(userId);
  }

  async executeByWorkspace(workspaceId: string) {
    return this.templates.findByWorkspace(workspaceId);
  }
}

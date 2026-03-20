import type { TemplateRepository } from "../../../domain/ports/template-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class DeleteTemplateUseCase {
  constructor(private templates: TemplateRepository) {}

  async execute(id: string, userId: string) {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundError("Template");
    if (template.isBuiltIn || template.creatorId !== userId) throw new ForbiddenError();
    await this.templates.delete(id);
  }
}

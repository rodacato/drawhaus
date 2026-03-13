import type { TemplateRepository } from "../../../domain/ports/template-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class UpdateTemplateUseCase {
  constructor(private templates: TemplateRepository) {}

  async execute(id: string, userId: string, data: { title?: string; description?: string; category?: string; thumbnail?: string }) {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundError("Template");
    if (template.isBuiltIn || template.creatorId !== userId) throw new ForbiddenError();
    const updated = await this.templates.update(id, data);
    if (!updated) throw new NotFoundError("Template");
    return updated;
  }
}

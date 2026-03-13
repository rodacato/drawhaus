import type { TemplateRepository } from "../../../domain/ports/template-repository";
import { NotFoundError } from "../../../domain/errors";

export class GetTemplateUseCase {
  constructor(private templates: TemplateRepository) {}

  async execute(id: string) {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundError("Template");
    return template;
  }
}

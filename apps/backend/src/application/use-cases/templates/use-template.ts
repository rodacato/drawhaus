import type { TemplateRepository } from "../../../domain/ports/template-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";

export class UseTemplateUseCase {
  constructor(
    private templates: TemplateRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(input: { templateId: string; userId: string; title?: string; workspaceId?: string | null; folderId?: string | null }) {
    const template = await this.templates.findById(input.templateId);
    if (!template) throw new NotFoundError("Template");

    const diagram = await this.diagrams.create({
      ownerId: input.userId,
      title: input.title ?? template.title,
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      elements: template.elements,
      appState: template.appState,
    });

    // Fire and forget — don't block diagram creation
    this.templates.incrementUsageCount(input.templateId).catch(() => {});

    return diagram;
  }
}

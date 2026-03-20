import type { TemplateRepository } from "../../../domain/ports/template-repository";

export class CreateTemplateUseCase {
  constructor(private templates: TemplateRepository) {}

  async execute(input: {
    creatorId: string;
    workspaceId?: string | null;
    title: string;
    description?: string;
    category?: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    thumbnail?: string | null;
  }) {
    return this.templates.create({
      creatorId: input.creatorId,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? "",
      category: input.category ?? "general",
      elements: input.elements,
      appState: input.appState,
      thumbnail: input.thumbnail,
    });
  }
}

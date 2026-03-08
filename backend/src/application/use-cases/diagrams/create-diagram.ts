import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class CreateDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(input: { ownerId: string; title?: string; folderId?: string | null; elements?: unknown[]; appState?: Record<string, unknown> }) {
    return this.diagrams.create({
      ownerId: input.ownerId,
      title: input.title ?? "Untitled",
      folderId: input.folderId,
      elements: input.elements,
      appState: input.appState,
    });
  }
}

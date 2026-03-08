import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class CreateDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(input: { ownerId: string; title?: string; elements?: unknown[]; appState?: Record<string, unknown> }) {
    return this.diagrams.create({
      ownerId: input.ownerId,
      title: input.title ?? "Untitled",
      elements: input.elements,
      appState: input.appState,
    });
  }
}

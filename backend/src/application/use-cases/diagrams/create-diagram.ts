import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class CreateDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(input: { ownerId: string; title?: string }) {
    return this.diagrams.create({
      ownerId: input.ownerId,
      title: input.title ?? "Untitled",
    });
  }
}

import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";

export class ListLinksUseCase {
  constructor(
    private shares: ShareRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string) {
    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram || diagram.ownerId !== userId) throw new NotFoundError("Diagram");

    return this.shares.findByDiagram(diagramId);
  }
}

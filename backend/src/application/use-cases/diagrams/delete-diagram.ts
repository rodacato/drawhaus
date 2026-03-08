import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class DeleteDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(diagramId: string, userId: string) {
    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram");
    if (diagram.ownerId !== userId) throw new ForbiddenError();
    await this.diagrams.delete(diagramId);
  }
}

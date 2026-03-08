import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";

export class GetDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(diagramId: string, userId: string) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");

    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    return diagram;
  }
}

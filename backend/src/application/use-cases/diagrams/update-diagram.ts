import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class UpdateDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(
    diagramId: string,
    userId: string,
    data: { title?: string; elements?: unknown[]; appState?: Record<string, unknown> },
  ) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    if (role !== "owner" && role !== "editor") throw new ForbiddenError();

    const updated = await this.diagrams.update(diagramId, data);
    if (!updated) throw new NotFoundError("Diagram");
    return updated;
  }
}

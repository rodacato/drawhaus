import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";

export class UpdateDiagramUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(
    diagramId: string,
    userId: string,
    data: { title?: string; elements?: unknown[]; appState?: Record<string, unknown> },
  ) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireEditAccess(role);

    const updated = await this.diagrams.update(diagramId, data);
    if (!updated) throw new NotFoundError("Diagram");
    return updated;
  }
}

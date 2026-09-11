import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";
import { withSceneContent } from "../../helpers/scene-content";

export class UpdateDiagramUseCase {
  constructor(
    private readonly diagrams: DiagramRepository,
    private readonly scenes: SceneRepository,
  ) {}

  async execute(
    diagramId: string,
    userId: string,
    data: { title?: string; elements?: unknown[]; appState?: Record<string, unknown> },
  ) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireEditAccess(role);

    const updated = await this.diagrams.update(diagramId, data);
    if (!updated) throw new NotFoundError("Diagram");
    return withSceneContent(updated, this.scenes);
  }
}

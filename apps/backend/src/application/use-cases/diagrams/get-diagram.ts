import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";
import { withSceneContent } from "../../helpers/scene-content";

export class GetDiagramUseCase {
  constructor(
    private readonly diagrams: DiagramRepository,
    private readonly scenes: SceneRepository,
  ) {}

  async execute(diagramId: string, userId: string) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireAccess(role);

    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    return withSceneContent(diagram, this.scenes);
  }
}

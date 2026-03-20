import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";

export class GetDiagramUseCase {
  constructor(
    private diagrams: DiagramRepository,
    private scenes?: SceneRepository,
  ) {}

  async execute(diagramId: string, userId: string) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireAccess(role);

    const diagram = await this.diagrams.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram");

    // Return first scene's data when available — it's the source of truth
    if (this.scenes) {
      const scenes = await this.scenes.findByDiagram(diagramId);
      if (scenes.length > 0) {
        return { ...diagram, elements: scenes[0].elements, appState: scenes[0].appState };
      }
    }

    return diagram;
  }
}

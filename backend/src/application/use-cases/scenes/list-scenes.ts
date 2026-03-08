import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import type { Scene } from "../../../domain/entities/scene";

export class ListScenesUseCase {
  constructor(
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string): Promise<Scene[]> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");

    const scenes = await this.scenes.findByDiagram(diagramId);

    // Lazy migration: if diagram has no scenes, create default from diagram data
    if (scenes.length === 0) {
      const diagram = await this.diagrams.findById(diagramId);
      if (!diagram) throw new NotFoundError("Diagram");
      const scene = await this.scenes.create({
        diagramId,
        name: "Scene 1",
        sortOrder: 0,
        elements: diagram.elements,
        appState: diagram.appState,
      });
      return [scene];
    }

    return scenes;
  }
}

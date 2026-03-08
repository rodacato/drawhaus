import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import type { Scene } from "../../../domain/entities/scene";

export class GetSceneUseCase {
  constructor(
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(sceneId: string, userId: string): Promise<Scene> {
    const scene = await this.scenes.findById(sceneId);
    if (!scene) throw new NotFoundError("Scene");

    const role = await this.diagrams.findAccessRole(scene.diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");

    return scene;
  }
}

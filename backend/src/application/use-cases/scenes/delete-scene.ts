import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class DeleteSceneUseCase {
  constructor(
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(sceneId: string, userId: string): Promise<void> {
    const scene = await this.scenes.findById(sceneId);
    if (!scene) throw new NotFoundError("Scene");

    const role = await this.diagrams.findAccessRole(scene.diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    if (role === "viewer") throw new ForbiddenError();

    // Don't delete the last scene
    const siblings = await this.scenes.findByDiagram(scene.diagramId);
    if (siblings.length <= 1) {
      const err = new Error("Cannot delete the only scene");
      (err as Error & { status: number }).status = 400;
      throw err;
    }

    await this.scenes.delete(sceneId);
  }
}

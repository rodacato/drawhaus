import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";
import type { Scene } from "../../../domain/entities/scene";

export class RenameSceneUseCase {
  constructor(
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(sceneId: string, userId: string, name: string): Promise<Scene> {
    const scene = await this.scenes.findById(sceneId);
    if (!scene) throw new NotFoundError("Scene");

    const role = await this.diagrams.findAccessRole(scene.diagramId, userId);
    requireEditAccess(role);

    const updated = await this.scenes.rename(sceneId, name);
    if (!updated) throw new NotFoundError("Scene");
    return updated;
  }
}

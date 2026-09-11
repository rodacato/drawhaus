import type { SceneRepository } from "../../../domain/ports/scene-repository";
import { NotFoundError } from "../../../domain/errors";

export class SaveSceneUseCase {
  constructor(private readonly scenes: SceneRepository) {}

  async execute(
    diagramId: string,
    sceneId: string,
    elements: unknown[],
    appState: Record<string, unknown>,
  ) {
    const saved = await this.scenes.updateSceneMerged(sceneId, diagramId, elements, appState);
    if (!saved) throw new NotFoundError("Scene");
  }
}

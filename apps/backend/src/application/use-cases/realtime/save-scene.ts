import type { SceneRepository } from "../../../domain/ports/scene-repository";

export class SaveSceneUseCase {
  constructor(private scenes: SceneRepository) {}

  async execute(sceneId: string, elements: unknown[], appState: Record<string, unknown>) {
    await this.scenes.updateSceneMerged(sceneId, elements, appState);
  }
}

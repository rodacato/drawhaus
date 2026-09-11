import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { Scene } from "../../../domain/entities/scene";
import { NotFoundError } from "../../../domain/errors";

export type SaveSceneResult = { status: "saved" } | { status: "stale"; scene: Scene };

export class SaveSceneUseCase {
  constructor(private readonly scenes: SceneRepository) {}

  /**
   * Merges a client's copy into the stored scene. A copy based on an older `revision` was
   * computed before a restore or a content PATCH replaced the scene, and merging it would bring
   * back what that replace removed; it is refused and the caller gets the current scene instead.
   * A save without a revision, from a client older than ADR-026, is merged unchecked.
   */
  async execute(
    diagramId: string,
    sceneId: string,
    elements: unknown[],
    appState: Record<string, unknown>,
    revision?: number,
  ): Promise<SaveSceneResult> {
    const result = await this.scenes.updateSceneMerged(
      sceneId,
      diagramId,
      elements,
      appState,
      revision,
    );
    if (result === "saved") return { status: "saved" };
    const current = result === "stale" ? await this.scenes.findById(sceneId) : null;
    if (!current) throw new NotFoundError("Scene");
    return { status: "stale", scene: current };
  }
}

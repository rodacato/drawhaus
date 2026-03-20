import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";
import { logger } from "../../../infrastructure/logger";

export class RestoreSnapshotUseCase {
  constructor(
    private snapshots: SnapshotRepository,
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(snapshotId: string, userId: string): Promise<{ diagramId: string; elements: unknown[]; appState: Record<string, unknown>; sceneId: string | null }> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new NotFoundError("Snapshot");

    const role = await this.diagrams.findAccessRole(snapshot.diagramId, userId);
    requireEditAccess(role);

    // Create pre-restore backup of current state
    const scenes = await this.scenes.findByDiagram(snapshot.diagramId);
    const currentScene = scenes[0];
    if (currentScene) {
      await this.snapshots.create({
        diagramId: snapshot.diagramId,
        createdBy: userId,
        trigger: "manual",
        name: "Pre-restore backup",
        elements: currentScene.elements,
        appState: currentScene.appState,
      }).catch((err) => {
        logger.error(err, "Failed to create pre-restore snapshot");
      });

      // Restore: overwrite current scene with snapshot data
      await this.scenes.updateScene(currentScene.id, snapshot.elements, snapshot.appState);
    }

    return {
      diagramId: snapshot.diagramId,
      elements: snapshot.elements as unknown[],
      appState: snapshot.appState as Record<string, unknown>,
      sceneId: currentScene?.id ?? null,
    };
  }
}

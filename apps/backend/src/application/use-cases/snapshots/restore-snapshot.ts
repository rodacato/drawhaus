import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";

export class RestoreSnapshotUseCase {
  constructor(
    private readonly snapshots: SnapshotRepository,
    private readonly scenes: SceneRepository,
    private readonly diagrams: DiagramRepository,
  ) {}

  async execute(
    snapshotId: string,
    userId: string,
  ): Promise<{
    diagramId: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    sceneId: string | null;
  }> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new NotFoundError("Snapshot");

    const role = await this.diagrams.findAccessRole(snapshot.diagramId, userId);
    requireEditAccess(role);

    const scenes = await this.scenes.findByDiagram(snapshot.diagramId);
    const currentScene = scenes[0];
    if (currentScene) {
      // No backup, no restore: overwriting without one would lose the current content for good.
      await this.snapshots.create({
        diagramId: snapshot.diagramId,
        createdBy: userId,
        trigger: "manual",
        name: "Pre-restore backup",
        elements: currentScene.elements,
        appState: currentScene.appState,
      });

      await this.scenes.updateScene(currentScene.id, snapshot.elements, snapshot.appState);
    }

    return {
      diagramId: snapshot.diagramId,
      elements: snapshot.elements,
      appState: snapshot.appState,
      sceneId: currentScene?.id ?? null,
    };
  }
}

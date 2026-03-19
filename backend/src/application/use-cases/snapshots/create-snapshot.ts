import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramSnapshot, SnapshotTrigger } from "../../../domain/entities/diagram-snapshot";
import { NotFoundError } from "../../../domain/errors";
import { logger } from "../../../infrastructure/logger";

const DEDUP_WINDOW_MS = 30_000; // 30 seconds
const KEEP_COUNT = 10;
const KEEP_DAYS = 3;
const MAX_NAMED = 20;

export class CreateSnapshotUseCase {
  constructor(
    private snapshots: SnapshotRepository,
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(
    diagramId: string,
    createdBy: string | null,
    trigger: SnapshotTrigger,
    name?: string,
  ): Promise<DiagramSnapshot | null> {
    // Deduplication: skip if same trigger happened within window
    if (trigger !== "manual") {
      const latest = await this.snapshots.findLatest(diagramId, trigger);
      if (latest && Date.now() - latest.createdAt.getTime() < DEDUP_WINDOW_MS) {
        return null;
      }
    }

    // Enforce named snapshot limit
    if (name) {
      const namedCount = await this.snapshots.countNamed(diagramId);
      if (namedCount >= MAX_NAMED) {
        throw new Error(`Maximum of ${MAX_NAMED} named snapshots per diagram reached`);
      }
    }

    // Read the current scene for this diagram
    const scenes = await this.scenes.findByDiagram(diagramId);
    const scene = scenes[0];
    if (!scene) {
      throw new NotFoundError("Scene");
    }

    const snapshot = await this.snapshots.create({
      diagramId,
      createdBy,
      trigger,
      name: name ?? null,
      elements: scene.elements,
      appState: scene.appState,
    });

    // Fire-and-forget purge
    this.snapshots.purgeAuto(diagramId, KEEP_COUNT, KEEP_DAYS).catch((err) => {
      logger.error(err, "Failed to purge auto-snapshots");
    });

    return snapshot;
  }
}

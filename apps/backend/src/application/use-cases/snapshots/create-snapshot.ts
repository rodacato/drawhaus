import { createHash } from "node:crypto";
import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramSnapshot, SnapshotTrigger } from "../../../domain/entities/diagram-snapshot";
import { NotFoundError } from "../../../domain/errors";
import { logger } from "../../../infrastructure/logger";

const DEDUP_WINDOW_MS = 60_000; // 60 seconds — cross-trigger
const KEEP_COUNT = 10;
const KEEP_DAYS = 3;
const MAX_NAMED = 20;

function hashElements(elements: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(elements)).digest("hex");
}

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
    activeUsers?: number,
  ): Promise<DiagramSnapshot | null> {
    // Read the current scene for this diagram
    const scenes = await this.scenes.findByDiagram(diagramId);
    const scene = scenes[0];
    if (!scene) {
      throw new NotFoundError("Scene");
    }

    const contentHash = hashElements(scene.elements);

    // For auto-snapshots: cross-trigger dedup + content hash check
    if (trigger !== "manual") {
      const latest = await this.snapshots.findLatestForDiagram(diagramId);
      if (latest) {
        // Time-based dedup: skip if any snapshot was created within 60s
        if (Date.now() - latest.createdAt.getTime() < DEDUP_WINDOW_MS) {
          return null;
        }
        // Content dedup: skip if elements haven't changed
        if (latest.contentHash === contentHash) {
          return null;
        }
      }
    }

    // Enforce named snapshot limit
    if (name) {
      const namedCount = await this.snapshots.countNamed(diagramId);
      if (namedCount >= MAX_NAMED) {
        throw new Error(`Maximum of ${MAX_NAMED} named snapshots per diagram reached`);
      }
    }

    const snapshot = await this.snapshots.create({
      diagramId,
      createdBy,
      trigger,
      name: name ?? null,
      activeUsers: activeUsers ?? 1,
      contentHash,
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

import { createHash } from "node:crypto";
import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramSnapshot, SnapshotTrigger } from "../../../domain/entities/diagram-snapshot";
import type { Scene } from "../../../domain/entities/scene";
import { NotFoundError } from "../../../domain/errors";
import { logger } from "../../../infrastructure/logger";
import { requireEditAccess } from "../../helpers/require-access";

const DEDUP_WINDOW_MS = 60_000; // 60 seconds — cross-trigger
const KEEP_COUNT = 10;
const KEEP_DAYS = 3;
const MAX_NAMED = 20;

export type AutomaticSnapshotTrigger = Exclude<SnapshotTrigger, "manual">;

function hashElements(elements: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(elements)).digest("hex");
}

export class CreateSnapshotUseCase {
  constructor(
    private readonly snapshots: SnapshotRepository,
    private readonly scenes: SceneRepository,
    private readonly diagrams: DiagramRepository,
  ) {}

  async createManual(diagramId: string, userId: string, name?: string): Promise<DiagramSnapshot> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireEditAccess(role);

    const scene = await this.currentScene(diagramId);

    if (name) {
      const namedCount = await this.snapshots.countNamed(diagramId);
      if (namedCount >= MAX_NAMED) {
        throw new Error(`Maximum of ${MAX_NAMED} named snapshots per diagram reached`);
      }
    }

    return this.persist(scene, hashElements(scene.elements), {
      createdBy: userId,
      trigger: "manual",
      name: name ?? null,
      activeUsers: 1,
    });
  }

  /** Callers are gated by room membership and canEdit; a guest editor has no diagram role to check. */
  async createAutomatic(
    diagramId: string,
    trigger: AutomaticSnapshotTrigger,
    createdBy: string | null,
    activeUsers: number,
  ): Promise<DiagramSnapshot | null> {
    const scene = await this.currentScene(diagramId);
    const contentHash = hashElements(scene.elements);

    const latest = await this.snapshots.findLatestForDiagram(diagramId);
    if (latest) {
      if (Date.now() - latest.createdAt.getTime() < DEDUP_WINDOW_MS) return null;
      if (latest.contentHash === contentHash) return null;
    }

    return this.persist(scene, contentHash, { createdBy, trigger, name: null, activeUsers });
  }

  private async currentScene(diagramId: string): Promise<Scene> {
    const [scene] = await this.scenes.findByDiagram(diagramId);
    if (!scene) throw new NotFoundError("Scene");
    return scene;
  }

  private async persist(
    scene: Scene,
    contentHash: string,
    meta: {
      createdBy: string | null;
      trigger: SnapshotTrigger;
      name: string | null;
      activeUsers: number;
    },
  ): Promise<DiagramSnapshot> {
    const snapshot = await this.snapshots.create({
      diagramId: scene.diagramId,
      ...meta,
      contentHash,
      elements: scene.elements,
      appState: scene.appState,
    });

    this.snapshots.purgeAuto(scene.diagramId, KEEP_COUNT, KEEP_DAYS).catch((err) => {
      logger.error(err, "Failed to purge auto-snapshots");
    });

    return snapshot;
  }
}

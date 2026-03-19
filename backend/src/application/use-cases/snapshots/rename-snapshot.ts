import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramSnapshot } from "../../../domain/entities/diagram-snapshot";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";

const MAX_NAMED = 20;

export class RenameSnapshotUseCase {
  constructor(
    private snapshots: SnapshotRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(snapshotId: string, userId: string, name: string | null): Promise<DiagramSnapshot> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new NotFoundError("Snapshot");

    const role = await this.diagrams.findAccessRole(snapshot.diagramId, userId);
    requireEditAccess(role);

    // If naming (not un-naming), check limit
    if (name && !snapshot.name) {
      const namedCount = await this.snapshots.countNamed(snapshot.diagramId);
      if (namedCount >= MAX_NAMED) {
        throw new Error(`Maximum of ${MAX_NAMED} named snapshots per diagram reached`);
      }
    }

    const updated = await this.snapshots.rename(snapshotId, name);
    if (!updated) throw new NotFoundError("Snapshot");
    return updated;
  }
}

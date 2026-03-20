import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";

export class DeleteSnapshotUseCase {
  constructor(
    private snapshots: SnapshotRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(snapshotId: string, userId: string): Promise<void> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new NotFoundError("Snapshot");

    const role = await this.diagrams.findAccessRole(snapshot.diagramId, userId);
    requireEditAccess(role);

    await this.snapshots.delete(snapshotId);
  }
}

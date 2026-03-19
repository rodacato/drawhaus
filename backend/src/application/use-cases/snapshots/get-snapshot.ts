import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramSnapshot } from "../../../domain/entities/diagram-snapshot";
import { NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";

export class GetSnapshotUseCase {
  constructor(
    private snapshots: SnapshotRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(snapshotId: string, userId: string): Promise<DiagramSnapshot> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new NotFoundError("Snapshot");

    const role = await this.diagrams.findAccessRole(snapshot.diagramId, userId);
    requireAccess(role);

    return snapshot;
  }
}

import type { SnapshotRepository } from "../../../domain/ports/snapshot-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramSnapshot } from "../../../domain/entities/diagram-snapshot";
import { requireAccess } from "../../helpers/require-access";

export class ListSnapshotsUseCase {
  constructor(
    private readonly snapshots: SnapshotRepository,
    private readonly diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string): Promise<DiagramSnapshot[]> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireAccess(role);
    return this.snapshots.listByDiagram(diagramId);
  }
}

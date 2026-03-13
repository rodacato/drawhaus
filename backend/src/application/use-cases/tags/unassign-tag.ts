import type { TagRepository } from "../../../domain/ports/tag-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { requireOwnerAccess } from "../../helpers/require-access";

export class UnassignTagUseCase {
  constructor(
    private tags: TagRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(tagId: string, diagramId: string, userId: string) {
    // Verify the user owns the diagram
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireOwnerAccess(role);

    await this.tags.unassignFromDiagram(diagramId, tagId);
  }
}

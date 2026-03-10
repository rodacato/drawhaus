import type { TagRepository } from "../../../domain/ports/tag-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class UnassignTagUseCase {
  constructor(
    private tags: TagRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(tagId: string, diagramId: string, userId: string) {
    // Verify the user owns the diagram
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    if (role !== "owner") throw new ForbiddenError();

    await this.tags.unassignFromDiagram(diagramId, tagId);
  }
}

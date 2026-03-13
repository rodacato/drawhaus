import type { TagRepository } from "../../../domain/ports/tag-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireOwnerAccess } from "../../helpers/require-access";

export class AssignTagUseCase {
  constructor(
    private tags: TagRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(tagId: string, diagramId: string, userId: string) {
    // Verify the user owns the diagram
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireOwnerAccess(role);

    // Verify the tag exists and belongs to the user (list will only return user's tags)
    const userTags = await this.tags.list(userId);
    const tag = userTags.find((t) => t.id === tagId);
    if (!tag) throw new NotFoundError("Tag");

    await this.tags.assignToDiagram(diagramId, tagId);
  }
}

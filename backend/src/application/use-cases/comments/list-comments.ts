import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import type { CommentThread } from "../../../domain/entities/comment";

export class ListCommentsUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string): Promise<CommentThread[]> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    return this.comments.findByDiagram(diagramId);
  }
}

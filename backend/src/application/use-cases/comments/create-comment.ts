import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import type { CommentThread } from "../../../domain/entities/comment";

export class CreateCommentUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string, elementId: string, body: string): Promise<CommentThread> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    return this.comments.createThread({ diagramId, elementId, authorId: userId, body });
  }
}

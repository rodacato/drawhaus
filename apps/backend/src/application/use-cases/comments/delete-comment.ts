import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";

export class DeleteCommentUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(threadId: string, userId: string): Promise<void> {
    const thread = await this.comments.findThreadById(threadId);
    if (!thread) throw new NotFoundError("Comment thread");

    const role = await this.diagrams.findAccessRole(thread.diagramId, userId);
    requireAccess(role);

    // Only thread author or diagram owner can delete
    if (thread.authorId !== userId && role !== "owner") throw new ForbiddenError();

    await this.comments.deleteThread(threadId);
  }
}

import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import type { CommentThread } from "../../../domain/entities/comment";

export class ResolveCommentUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(threadId: string, userId: string, resolve: boolean): Promise<CommentThread> {
    const thread = await this.comments.findThreadById(threadId);
    if (!thread) throw new NotFoundError("Comment thread");

    const role = await this.diagrams.findAccessRole(thread.diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    if (role === "viewer") throw new ForbiddenError();

    const updated = resolve
      ? await this.comments.resolveThread(threadId, userId)
      : await this.comments.unresolveThread(threadId);

    if (!updated) throw new NotFoundError("Comment thread");
    return updated;
  }
}

import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";
import type { CommentReply } from "../../../domain/entities/comment";

export class ReplyCommentUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(threadId: string, userId: string, body: string): Promise<CommentReply> {
    const thread = await this.comments.findThreadById(threadId);
    if (!thread) throw new NotFoundError("Comment thread");

    const role = await this.diagrams.findAccessRole(thread.diagramId, userId);
    requireAccess(role);

    return this.comments.addReply({ threadId, authorId: userId, body });
  }
}

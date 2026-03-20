import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";

export class ToggleLikeUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(threadId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const thread = await this.comments.findThreadById(threadId);
    if (!thread) throw new NotFoundError("Comment thread");

    const role = await this.diagrams.findAccessRole(thread.diagramId, userId);
    requireAccess(role);

    const liked = await this.comments.toggleLike(threadId, userId);
    const updated = await this.comments.findThreadById(threadId, userId);
    return { liked, likeCount: updated?.likeCount ?? 0 };
  }
}

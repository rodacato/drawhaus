import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { requireAccess } from "../../helpers/require-access";
import type { CommentThread } from "../../../domain/entities/comment";

export class CreateCommentUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string, elementId: string, body: string, sceneId?: string | null): Promise<CommentThread> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireAccess(role);
    return this.comments.createThread({ diagramId, sceneId: sceneId ?? null, elementId, authorId: userId, body });
  }
}

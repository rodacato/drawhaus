import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { requireAccess } from "../../helpers/require-access";
import type { CommentThread } from "../../../domain/entities/comment";

export class ListCommentsUseCase {
  constructor(
    private comments: CommentRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string, sceneId?: string | null): Promise<CommentThread[]> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireAccess(role);
    return this.comments.findByDiagram(diagramId, sceneId, userId);
  }
}

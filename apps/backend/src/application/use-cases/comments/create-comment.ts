import type { CommentRepository } from "../../../domain/ports/comment-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import { NotFoundError } from "../../../domain/errors";
import { requireAccess } from "../../helpers/require-access";
import type { CommentThread } from "../../../domain/entities/comment";

export class CreateCommentUseCase {
  constructor(
    private readonly comments: CommentRepository,
    private readonly diagrams: DiagramRepository,
    private readonly scenes: SceneRepository,
  ) {}

  async execute(
    diagramId: string,
    userId: string,
    elementId: string,
    body: string,
    sceneId?: string | null,
  ): Promise<CommentThread> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireAccess(role);
    if (sceneId) {
      const scene = await this.scenes.findById(sceneId);
      if (scene?.diagramId !== diagramId) throw new NotFoundError("Scene");
    }
    return this.comments.createThread({
      diagramId,
      sceneId: sceneId ?? null,
      elementId,
      authorId: userId,
      body,
    });
  }
}

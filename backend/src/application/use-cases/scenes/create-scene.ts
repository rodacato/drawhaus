import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";
import type { Scene } from "../../../domain/entities/scene";

export class CreateSceneUseCase {
  constructor(
    private scenes: SceneRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(diagramId: string, userId: string, name?: string): Promise<Scene> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role) throw new NotFoundError("Diagram");
    if (role === "viewer") throw new ForbiddenError();

    const existing = await this.scenes.findByDiagram(diagramId);
    const nextOrder = existing.length > 0
      ? Math.max(...existing.map((s) => s.sortOrder)) + 1
      : 0;

    return this.scenes.create({
      diagramId,
      name: name || `Scene ${nextOrder + 1}`,
      sortOrder: nextOrder,
    });
  }
}

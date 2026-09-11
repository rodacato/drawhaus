import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { Diagram } from "../../../domain/entities/diagram";
import { requireAccess } from "../../helpers/require-access";
import { withSceneContent } from "../../helpers/scene-content";

export class DuplicateDiagramUseCase {
  constructor(
    private readonly diagramRepo: DiagramRepository,
    private readonly scenes: SceneRepository,
  ) {}

  async execute(diagramId: string, userId: string): Promise<Diagram> {
    const original = await this.diagramRepo.findById(diagramId);
    if (!original) throw new Error("Diagram not found");
    const role = await this.diagramRepo.findAccessRole(diagramId, userId);
    requireAccess(role);
    const source = await withSceneContent(original, this.scenes);
    return this.diagramRepo.create({
      title: `${original.title} (copy)`,
      ownerId: userId,
      workspaceId: original.workspaceId,
      folderId: original.folderId,
      elements: source.elements,
      appState: source.appState,
      thumbnail: original.thumbnail,
    });
  }
}

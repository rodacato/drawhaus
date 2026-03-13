import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { Diagram } from "../../../domain/entities/diagram";
import { requireAccess } from "../../helpers/require-access";

export class DuplicateDiagramUseCase {
  constructor(private diagramRepo: DiagramRepository) {}

  async execute(diagramId: string, userId: string): Promise<Diagram> {
    const original = await this.diagramRepo.findById(diagramId);
    if (!original) throw new Error("Diagram not found");
    const role = await this.diagramRepo.findAccessRole(diagramId, userId);
    requireAccess(role);
    return this.diagramRepo.create({
      title: `${original.title} (copy)`,
      ownerId: userId,
      folderId: original.folderId,
      elements: original.elements,
      appState: original.appState,
      thumbnail: original.thumbnail,
    });
  }
}

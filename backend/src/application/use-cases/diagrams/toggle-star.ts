import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class ToggleStarUseCase {
  constructor(private diagramRepo: DiagramRepository) {}

  async execute(diagramId: string, userId: string, starred: boolean): Promise<void> {
    const role = await this.diagramRepo.findAccessRole(diagramId, userId);
    if (!role) throw new Error("Diagram not found");
    await this.diagramRepo.toggleStar(diagramId, starred);
  }
}

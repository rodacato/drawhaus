import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { requireAccess } from "../../helpers/require-access";

export class ToggleStarUseCase {
  constructor(private diagramRepo: DiagramRepository) {}

  async execute(diagramId: string, userId: string, starred: boolean): Promise<void> {
    const role = await this.diagramRepo.findAccessRole(diagramId, userId);
    requireAccess(role);
    await this.diagramRepo.toggleStar(diagramId, starred);
  }
}

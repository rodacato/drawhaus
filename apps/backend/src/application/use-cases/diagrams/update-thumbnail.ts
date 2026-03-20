import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import { requireEditAccess } from "../../helpers/require-access";

export class UpdateThumbnailUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(diagramId: string, userId: string, thumbnail: string): Promise<void> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireEditAccess(role);
    await this.diagrams.updateThumbnail(diagramId, thumbnail);
  }
}

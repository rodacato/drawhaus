import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class UpdateThumbnailUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(diagramId: string, userId: string, thumbnail: string): Promise<void> {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    if (!role || role === "viewer") {
      const err = new Error("Forbidden");
      (err as any).status = 403;
      throw err;
    }
    await this.diagrams.updateThumbnail(diagramId, thumbnail);
  }
}

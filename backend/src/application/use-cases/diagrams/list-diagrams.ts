import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class ListDiagramsUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(userId: string, folderId?: string | null) {
    return this.diagrams.findByUser(userId, folderId);
  }
}

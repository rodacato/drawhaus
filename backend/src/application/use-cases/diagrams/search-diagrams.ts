import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class SearchDiagramsUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(userId: string, query: string) {
    if (!query.trim()) return [];
    return this.diagrams.search(userId, query.trim());
  }
}

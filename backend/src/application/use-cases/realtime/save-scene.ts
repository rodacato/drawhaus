import type { DiagramRepository } from "../../../domain/ports/diagram-repository";

export class SaveSceneUseCase {
  constructor(private diagrams: DiagramRepository) {}

  async execute(diagramId: string, elements: unknown[], appState: Record<string, unknown>) {
    await this.diagrams.updateScene(diagramId, elements, appState);
  }
}

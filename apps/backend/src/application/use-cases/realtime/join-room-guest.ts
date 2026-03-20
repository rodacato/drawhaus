import type { ShareRepository } from "../../../domain/ports/share-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { Scene } from "../../../domain/entities/scene";
import { NotFoundError } from "../../../domain/errors";
import { isShareLinkExpired } from "../../../domain/entities/share-link";

export class JoinRoomGuestUseCase {
  constructor(
    private shares: ShareRepository,
    private diagrams: DiagramRepository,
    private scenes: SceneRepository,
  ) {}

  async execute(shareToken: string): Promise<{
    diagramId: string;
    role: "editor" | "viewer";
    scenes: Scene[];
    elements: unknown[];
    appState: Record<string, unknown>;
  }> {
    const link = await this.shares.findByToken(shareToken);
    if (!link || isShareLinkExpired(link)) {
      throw new NotFoundError("Share link");
    }

    let scenes = await this.scenes.findByDiagram(link.diagramId);

    // Lazy migration
    if (scenes.length === 0) {
      const diagram = await this.diagrams.findById(link.diagramId);
      const scene = await this.scenes.create({
        diagramId: link.diagramId,
        name: "Scene 1",
        sortOrder: 0,
        elements: diagram?.elements ?? [],
        appState: diagram?.appState ?? {},
      });
      scenes = [scene];
    }

    const firstScene = scenes[0];
    return {
      diagramId: link.diagramId,
      role: link.role,
      scenes,
      elements: firstScene.elements,
      appState: firstScene.appState,
    };
  }
}

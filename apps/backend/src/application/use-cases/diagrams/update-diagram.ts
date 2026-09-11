import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import { NotFoundError } from "../../../domain/errors";
import { requireEditAccess } from "../../helpers/require-access";
import { applySceneContent } from "../../helpers/scene-content";

type UpdateData = { title?: string; elements?: unknown[]; appState?: Record<string, unknown> };

/** Mirrors what the repository treats as a content write; a title-only update never touches a scene (ADR-025). */
function replacesContent(data: UpdateData): boolean {
  return data.elements !== undefined || data.appState !== undefined;
}

export class UpdateDiagramUseCase {
  constructor(
    private readonly diagrams: DiagramRepository,
    private readonly scenes: SceneRepository,
    private readonly notifier?: RealtimeNotifier,
  ) {}

  async execute(diagramId: string, userId: string, data: UpdateData) {
    const role = await this.diagrams.findAccessRole(diagramId, userId);
    requireEditAccess(role);

    const updated = await this.diagrams.update(diagramId, data);
    if (!updated) throw new NotFoundError("Diagram");

    const [scene] = await this.scenes.findByDiagram(diagramId);
    if (scene && replacesContent(data)) {
      this.notifier?.sceneReplaced({
        diagramId,
        sceneId: scene.id,
        revision: scene.revision,
        elements: scene.elements,
        appState: scene.appState,
      });
    }

    return applySceneContent(updated, scene);
  }
}

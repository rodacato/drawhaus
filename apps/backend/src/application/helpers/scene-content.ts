import type { Diagram } from "../../domain/entities/diagram";
import type { Scene } from "../../domain/entities/scene";
import type { SceneRepository } from "../../domain/ports/scene-repository";

/** Once a diagram has a scene, the first scene holds its content; the row's copy can lag (ADR-025). */
export function applySceneContent(diagram: Diagram, scene: Scene | undefined): Diagram {
  return scene ? { ...diagram, elements: scene.elements, appState: scene.appState } : diagram;
}

export async function withSceneContent(
  diagram: Diagram,
  scenes: SceneRepository,
): Promise<Diagram> {
  const [first] = await scenes.findByDiagram(diagram.id);
  return applySceneContent(diagram, first);
}

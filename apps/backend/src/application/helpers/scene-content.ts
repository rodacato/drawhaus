import type { Diagram } from "../../domain/entities/diagram";
import type { SceneRepository } from "../../domain/ports/scene-repository";

/** Once a diagram has a scene, the first scene holds its content; the row's copy can lag (ADR-025). */
export async function withSceneContent(
  diagram: Diagram,
  scenes: SceneRepository,
): Promise<Diagram> {
  const [first] = await scenes.findByDiagram(diagram.id);
  return first ? { ...diagram, elements: first.elements, appState: first.appState } : diagram;
}

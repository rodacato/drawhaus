import type { SessionRepository, AuthUser } from "../../../domain/ports/session-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { SceneRepository } from "../../../domain/ports/scene-repository";
import type { DiagramRole } from "../../../domain/entities/diagram";
import type { Scene } from "../../../domain/entities/scene";
import { UnauthorizedError, NotFoundError } from "../../../domain/errors";

export class JoinRoomUseCase {
  constructor(
    private sessions: SessionRepository,
    private diagrams: DiagramRepository,
    private scenes: SceneRepository,
  ) {}

  async execute(sessionToken: string | null, roomId: string): Promise<{
    user: AuthUser;
    role: DiagramRole;
    scenes: Scene[];
    elements: unknown[];
    appState: Record<string, unknown>;
  }> {
    if (!sessionToken) throw new UnauthorizedError();
    const user = await this.sessions.findUserByToken(sessionToken);
    if (!user) throw new UnauthorizedError();

    const role = await this.diagrams.findAccessRole(roomId, user.id);
    if (!role) throw new NotFoundError("Diagram");

    let scenes = await this.scenes.findByDiagram(roomId);

    // Lazy migration: create default scene from diagram data
    if (scenes.length === 0) {
      const diagram = await this.diagrams.findById(roomId);
      const scene = await this.scenes.create({
        diagramId: roomId,
        name: "Scene 1",
        sortOrder: 0,
        elements: diagram?.elements ?? [],
        appState: diagram?.appState ?? {},
      });
      scenes = [scene];
    }

    const firstScene = scenes[0];
    return {
      user,
      role,
      scenes,
      elements: firstScene.elements,
      appState: firstScene.appState,
    };
  }
}

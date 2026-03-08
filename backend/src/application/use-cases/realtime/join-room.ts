import type { SessionRepository, AuthUser } from "../../../domain/ports/session-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { DiagramRole } from "../../../domain/entities/diagram";
import { UnauthorizedError, NotFoundError } from "../../../domain/errors";

export class JoinRoomUseCase {
  constructor(
    private sessions: SessionRepository,
    private diagrams: DiagramRepository,
  ) {}

  async execute(sessionToken: string | null, roomId: string): Promise<{
    user: AuthUser;
    role: DiagramRole;
    elements: unknown[];
    appState: Record<string, unknown>;
  }> {
    if (!sessionToken) throw new UnauthorizedError();
    const user = await this.sessions.findUserByToken(sessionToken);
    if (!user) throw new UnauthorizedError();

    const role = await this.diagrams.findAccessRole(roomId, user.id);
    if (!role) throw new NotFoundError("Diagram");

    const diagram = await this.diagrams.findById(roomId);
    return {
      user,
      role,
      elements: diagram?.elements ?? [],
      appState: diagram?.appState ?? {},
    };
  }
}

import type { SessionRepository, AuthUser } from "../../../domain/ports/session-repository";
import { UnauthorizedError } from "../../../domain/errors";

export class GetCurrentUserUseCase {
  constructor(private sessions: SessionRepository) {}

  async execute(sessionToken: string | null): Promise<AuthUser> {
    if (!sessionToken) throw new UnauthorizedError();
    const user = await this.sessions.findUserByToken(sessionToken);
    if (!user) throw new UnauthorizedError();
    return user;
  }
}

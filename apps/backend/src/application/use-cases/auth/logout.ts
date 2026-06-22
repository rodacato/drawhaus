import type { SessionRepository } from "../../../domain/ports/session-repository";

export class LogoutUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(sessionToken: string | null) {
    if (sessionToken) {
      await this.sessions.delete(sessionToken);
    }
  }
}

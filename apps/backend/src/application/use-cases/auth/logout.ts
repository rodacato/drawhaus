import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";

export class LogoutUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly notifier: RealtimeNotifier,
  ) {}

  async execute(sessionToken: string | null) {
    if (sessionToken) {
      await this.sessions.delete(sessionToken);
      this.notifier.accessRevoked({ kind: "session", sessionToken });
    }
  }
}

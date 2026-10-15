import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import type { Hasher } from "../../../domain/ports/hasher";
import { NotFoundError, UnauthorizedError } from "../../../domain/errors";

export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: Hasher,
    private readonly sessions: SessionRepository,
    private readonly notifier: RealtimeNotifier,
  ) {}

  async execute(
    userId: string,
    input: { currentPassword?: string; newPassword: string },
    currentSessionToken: string | null = null,
  ) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User");

    // If user has a password, verify current password
    if (user.passwordHash) {
      if (!input.currentPassword) throw new UnauthorizedError();
      const valid = await this.hasher.verify(input.currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedError();
    }
    // If user has no password (Google-only), allow setting one without currentPassword

    const newHash = await this.hasher.hash(input.newPassword);
    await this.users.update(userId, { passwordHash: newHash });

    const ended = currentSessionToken
      ? await this.sessions.deleteOthersForUser(userId, currentSessionToken)
      : (await this.sessions.deleteAllForUser(userId), []);
    for (const sessionToken of ended)
      this.notifier.accessRevoked({ kind: "session", sessionToken });
    if (!currentSessionToken) this.notifier.accessRevoked({ kind: "user-sessions", userId });
  }
}

import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { PasswordResetRepository } from "../../../domain/ports/password-reset-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import { NotFoundError, ExpiredError, ConflictError } from "../../../domain/errors";

export class ResetPasswordUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private resetTokens: PasswordResetRepository,
    private hasher: Hasher,
  ) {}

  async validate(token: string): Promise<{ valid: boolean }> {
    const reset = await this.resetTokens.findByToken(token);
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      return { valid: false };
    }
    return { valid: true };
  }

  async execute(input: { token: string; newPassword: string }): Promise<void> {
    const reset = await this.resetTokens.findByToken(input.token);
    if (!reset) throw new NotFoundError("Reset token");
    if (reset.usedAt) throw new ConflictError("This reset link has already been used");
    if (reset.expiresAt.getTime() <= Date.now()) throw new ExpiredError("Reset token");

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.update(reset.userId, { passwordHash });
    await this.resetTokens.markUsed(reset.id);

    // Invalidate all sessions for security
    await this.sessions.deleteAllForUser(reset.userId);
  }
}

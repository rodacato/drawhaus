import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { PasswordResetRepository } from "../../../domain/ports/password-reset-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import type { PasswordResetToken } from "../../../domain/entities/password-reset-token";
import { NotFoundError, ExpiredError, ConflictError } from "../../../domain/errors";

export class ResetPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly resetTokens: PasswordResetRepository,
    private readonly hasher: Hasher,
  ) {}

  async validate(token: string): Promise<{ valid: boolean }> {
    try {
      await this.assertUsableResetToken(token);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }

  async execute(input: { token: string; newPassword: string }): Promise<void> {
    const reset = await this.assertUsableResetToken(input.token);

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.update(reset.userId, { passwordHash });
    await this.resetTokens.markUsed(reset.id);

    // Invalidate all sessions for security
    await this.sessions.deleteAllForUser(reset.userId);
  }

  private async assertUsableResetToken(token: string): Promise<PasswordResetToken> {
    const reset = await this.resetTokens.findByToken(token);
    if (!reset) throw new NotFoundError("Reset token");
    if (reset.usedAt) throw new ConflictError("This reset link has already been used");
    if (reset.expiresAt.getTime() <= Date.now()) throw new ExpiredError("Reset token");
    return reset;
  }
}

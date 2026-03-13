import type { UserRepository } from "../../../domain/ports/user-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, UnauthorizedError } from "../../../domain/errors";

export class DeleteAccountUseCase {
  constructor(
    private users: UserRepository,
    private hasher: Hasher,
    private audit: AuditLogger,
  ) {}

  async execute(userId: string, password: string | null) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User");

    if (user.passwordHash) {
      // User has a password — verify it
      if (!password) throw new UnauthorizedError();
      const valid = await this.hasher.verify(password, user.passwordHash);
      if (!valid) throw new UnauthorizedError();
    }
    // Google-only users (no password) can delete without password verification

    this.audit.log({ actor: userId, action: "user.delete_account" });
    await this.users.delete(userId);
  }
}

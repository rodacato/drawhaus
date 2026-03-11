import type { UserRepository } from "../../../domain/ports/user-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import { NotFoundError, UnauthorizedError } from "../../../domain/errors";

export class ChangePasswordUseCase {
  constructor(
    private users: UserRepository,
    private hasher: Hasher,
  ) {}

  async execute(userId: string, input: { currentPassword?: string; newPassword: string }) {
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
  }
}

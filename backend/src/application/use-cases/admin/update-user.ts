import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { UserRole } from "../../../domain/entities/user";
import { NotFoundError, InvalidInputError } from "../../../domain/errors";

export class AdminUpdateUserUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
  ) {}

  async execute(targetId: string, adminId: string, data: { role?: UserRole; disabled?: boolean }) {
    if (targetId === adminId && data.disabled === true) {
      throw new InvalidInputError("Cannot disable your own account");
    }
    if (targetId === adminId && data.role === "user") {
      throw new InvalidInputError("Cannot demote yourself");
    }

    const user = await this.users.adminUpdate(targetId, data);
    if (!user) throw new NotFoundError("User");

    // Invalidate sessions when a user is disabled
    if (data.disabled === true) {
      await this.sessions.deleteAllForUser(targetId);
    }

    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}

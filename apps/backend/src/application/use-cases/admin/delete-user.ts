import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, InvalidInputError } from "../../../domain/errors";

export class AdminDeleteUserUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private audit: AuditLogger,
  ) {}

  async execute(targetId: string, adminId: string) {
    if (targetId === adminId) {
      throw new InvalidInputError("Cannot delete your own account");
    }

    const user = await this.users.findById(targetId);
    if (!user) throw new NotFoundError("User");

    if (user.role === "admin") {
      throw new InvalidInputError("Cannot delete an admin user");
    }

    this.audit.log({ actor: "admin", action: "admin.delete_user", target: targetId });
    await this.sessions.deleteAllForUser(targetId);
    await this.users.delete(targetId);
  }
}

import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { UserRole } from "../../../domain/entities/user";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import { NotFoundError, InvalidInputError, ForbiddenError } from "../../../domain/errors";

export class AdminUpdateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly audit: AuditLogger,
    private readonly notifier: RealtimeNotifier,
  ) {}

  async execute(targetId: string, adminId: string, data: { role?: UserRole; disabled?: boolean }) {
    const actor = await this.users.findById(adminId);
    if (actor?.role !== "admin") throw new ForbiddenError();

    if (targetId === adminId && data.disabled === true) {
      throw new InvalidInputError("Cannot disable your own account");
    }
    if (targetId === adminId && data.role === "user") {
      throw new InvalidInputError("Cannot demote yourself");
    }

    const user = await this.users.adminUpdate(targetId, data);
    if (!user) throw new NotFoundError("User");

    if (data.disabled === true) {
      await this.sessions.deleteAllForUser(targetId);
      this.notifier.accessRevoked({ kind: "user-sessions", userId: targetId });
    }

    this.audit.log({ actor: "admin", action: "admin.update_user", target: targetId });
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}

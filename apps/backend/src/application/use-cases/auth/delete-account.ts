import type { UserRepository } from "../../../domain/ports/user-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, UnauthorizedError, ConflictError } from "../../../domain/errors";

export class DeleteAccountUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: Hasher,
    private readonly audit: AuditLogger,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  async execute(userId: string, password: string | null) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User");

    if (user.passwordHash) {
      if (!password) {
        this.audit.log({ actor: userId, action: "user.delete_account.denied", meta: { reason: "missing_password" } });
        throw new UnauthorizedError();
      }
      const valid = await this.hasher.verify(password, user.passwordHash);
      if (!valid) {
        this.audit.log({ actor: userId, action: "user.delete_account.denied", meta: { reason: "wrong_password" } });
        throw new UnauthorizedError();
      }
    }
    // OAuth-only users (no password) can delete without password verification

    const sharedWorkspaces = await this.workspaces.findOwnedSharedWorkspaces(userId);
    if (sharedWorkspaces.length > 0) {
      this.audit.log({
        actor: userId,
        action: "user.delete_account.denied",
        meta: { reason: "owns_shared_workspaces", count: sharedWorkspaces.length },
      });
      throw new ConflictError("Transfer workspace ownership before deleting your account");
    }

    this.audit.log({ actor: userId, action: "user.delete_account" });
    await this.users.delete(userId);
  }
}

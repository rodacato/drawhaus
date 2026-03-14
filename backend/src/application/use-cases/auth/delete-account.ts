import type { UserRepository } from "../../../domain/ports/user-repository";
import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { NotFoundError, UnauthorizedError, ConflictError } from "../../../domain/errors";

export class DeleteAccountUseCase {
  constructor(
    private users: UserRepository,
    private hasher: Hasher,
    private audit: AuditLogger,
    private workspaces: WorkspaceRepository,
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

    // Block deletion if user owns shared workspaces (with other members)
    const sharedWorkspaces = await this.workspaces.findOwnedSharedWorkspaces(userId);
    if (sharedWorkspaces.length > 0) {
      throw new ConflictError("Transfer workspace ownership before deleting your account");
    }

    this.audit.log({ actor: userId, action: "user.delete_account" });
    await this.users.delete(userId);
  }
}

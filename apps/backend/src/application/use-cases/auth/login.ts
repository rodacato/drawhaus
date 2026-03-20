import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import type { AuditLogger } from "../../../domain/ports/audit-logger";
import { UnauthorizedError, ForbiddenError } from "../../../domain/errors";

export class LoginUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private hasher: Hasher,
    private audit: AuditLogger,
  ) {}

  async execute(input: { email: string; password: string }) {
    const email = input.email.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedError();

    if (user.disabled) throw new ForbiddenError();

    // Google-only accounts have no password
    if (!user.passwordHash) throw new UnauthorizedError();

    const valid = await this.hasher.verify(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError();

    const session = await this.sessions.create(user.id);
    this.audit.log({ actor: user.id, action: "user.login" });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      sessionToken: session.token,
    };
  }
}

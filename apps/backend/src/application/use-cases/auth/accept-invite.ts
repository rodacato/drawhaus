import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { InvitationRepository } from "../../../domain/ports/invitation-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import { NotFoundError, ExpiredError, ConflictError } from "../../../domain/errors";

export class AcceptInviteUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private invitations: InvitationRepository,
    private hasher: Hasher,
  ) {}

  async resolve(token: string) {
    const invitation = await this.invitations.findByToken(token);
    if (!invitation) throw new NotFoundError("Invitation");
    if (invitation.usedAt) throw new ConflictError("This invitation has already been used");
    if (invitation.expiresAt.getTime() <= Date.now()) throw new ExpiredError("Invitation");

    return { email: invitation.email, role: invitation.role };
  }

  async execute(input: { token: string; name: string; password: string }) {
    const invitation = await this.invitations.findByToken(input.token);
    if (!invitation) throw new NotFoundError("Invitation");
    if (invitation.usedAt) throw new ConflictError("This invitation has already been used");
    if (invitation.expiresAt.getTime() <= Date.now()) throw new ExpiredError("Invitation");

    const existing = await this.users.findByEmail(invitation.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({ email: invitation.email, name: input.name, passwordHash });

    if (invitation.role === "admin") {
      await this.users.adminUpdate(user.id, { role: "admin" });
      user.role = "admin";
    }

    await this.invitations.markUsed(invitation.id);
    const session = await this.sessions.create(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      sessionToken: session.token,
    };
  }
}

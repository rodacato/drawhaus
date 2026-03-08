import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import { UnauthorizedError } from "../../../domain/errors";

export class LoginUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private hasher: Hasher,
  ) {}

  async execute(input: { email: string; password: string }) {
    const email = input.email.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedError();

    const valid = await this.hasher.verify(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError();

    const session = await this.sessions.create(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      sessionToken: session.token,
    };
  }
}

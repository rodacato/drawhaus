import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import { ConflictError } from "../../../domain/errors";

export class RegisterUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private hasher: Hasher,
  ) {}

  async execute(input: { email: string; name: string; password: string }) {
    const email = input.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({ email, name: input.name, passwordHash });
    const session = await this.sessions.create(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      sessionToken: session.token,
    };
  }
}

import type { UserRepository } from "../../../domain/ports/user-repository";
import type { SessionRepository } from "../../../domain/ports/session-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { Hasher } from "../../../domain/ports/hasher";
import { ConflictError, ForbiddenError } from "../../../domain/errors";

export class RegisterUseCase {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository,
    private hasher: Hasher,
    private siteSettings?: SiteSettingsRepository,
  ) {}

  async execute(input: { email: string; name: string; password: string }) {
    const email = input.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictError("Email already registered");

    const userCount = await this.users.count();
    const isFirstUser = userCount === 0;

    // Gate registration unless it's the first user
    if (!isFirstUser && this.siteSettings) {
      const settings = await this.siteSettings.get();
      if (!settings.registrationOpen) {
        throw new ForbiddenError();
      }
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({ email, name: input.name, passwordHash });

    // First user becomes admin
    if (isFirstUser) {
      await this.users.adminUpdate(user.id, { role: "admin" });
      user.role = "admin";
    }

    const session = await this.sessions.create(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      sessionToken: session.token,
    };
  }
}

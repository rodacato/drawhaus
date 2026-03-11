import crypto from "crypto";
import type { SessionRepository, AuthUser } from "../../domain/ports/session-repository";
import type { Session } from "../../domain/entities/session";
import type { User } from "../../domain/entities/user";

export class InMemorySessionRepository implements SessionRepository {
  sessions: Session[] = [];
  private users: () => User[];

  constructor(usersGetter: () => User[]) {
    this.users = usersGetter;
  }

  async create(userId: string): Promise<Session> {
    const session: Session = {
      token: crypto.randomBytes(16).toString("hex"),
      userId,
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    };
    this.sessions.push(session);
    return session;
  }

  async findUserByToken(token: string): Promise<AuthUser | null> {
    const session = this.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    const user = this.users().find((u) => u.id === session.userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role, disabled: user.disabled, avatarUrl: user.avatarUrl, hasPassword: !!user.passwordHash };
  }

  async delete(token: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.token !== token);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.userId !== userId);
  }
}

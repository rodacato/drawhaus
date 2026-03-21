import crypto from "crypto";
import type { UserRepository } from "../../domain/ports/user-repository";
import type { User, UserRole } from "../../domain/entities/user";

export class InMemoryUserRepository implements UserRepository {
  store: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.store.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.store.find((u) => u.email === email) ?? null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.store.find((u) => u.googleId === googleId) ?? null;
  }

  async findByGitHubId(githubId: string): Promise<User | null> {
    return this.store.find((u) => u.githubId === githubId) ?? null;
  }

  async create(data: { email: string; name: string; passwordHash: string | null; googleId?: string; githubId?: string; githubUsername?: string; avatarUrl?: string }): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: "user",
      disabled: false,
      googleId: data.googleId ?? null,
      githubId: data.githubId ?? null,
      githubUsername: data.githubUsername ?? null,
      avatarUrl: data.avatarUrl ?? null,
      createdAt: new Date(),
    };
    this.store.push(user);
    return user;
  }

  async update(id: string, data: Partial<Pick<User, "email" | "name" | "passwordHash" | "googleId" | "githubId" | "githubUsername" | "avatarUrl">>): Promise<User | null> {
    const user = this.store.find((u) => u.id === id);
    if (!user) return null;
    if (data.email !== undefined) user.email = data.email;
    if (data.name !== undefined) user.name = data.name;
    if (data.passwordHash !== undefined) user.passwordHash = data.passwordHash;
    if (data.googleId !== undefined) user.googleId = data.googleId;
    if (data.githubId !== undefined) user.githubId = data.githubId;
    if (data.githubUsername !== undefined) user.githubUsername = data.githubUsername;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    return user;
  }

  async count(): Promise<number> {
    return this.store.length;
  }

  async listAll(): Promise<Omit<User, "passwordHash">[]> {
    return this.store.map(({ passwordHash: _passwordHash, ...rest }) => rest);
  }

  async adminUpdate(id: string, data: { role?: UserRole; disabled?: boolean }): Promise<User | null> {
    const user = this.store.find((u) => u.id === id);
    if (!user) return null;
    if (data.role !== undefined) user.role = data.role;
    if (data.disabled !== undefined) user.disabled = data.disabled;
    return user;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((u) => u.id !== id);
  }
}

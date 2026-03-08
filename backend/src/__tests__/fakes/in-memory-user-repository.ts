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

  async create(data: { email: string; name: string; passwordHash: string }): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: "user",
      disabled: false,
      createdAt: new Date(),
    };
    this.store.push(user);
    return user;
  }

  async update(id: string, data: Partial<Pick<User, "email" | "name" | "passwordHash">>): Promise<User | null> {
    const user = this.store.find((u) => u.id === id);
    if (!user) return null;
    if (data.email !== undefined) user.email = data.email;
    if (data.name !== undefined) user.name = data.name;
    if (data.passwordHash !== undefined) user.passwordHash = data.passwordHash;
    return user;
  }

  async count(): Promise<number> {
    return this.store.length;
  }

  async listAll(): Promise<Omit<User, "passwordHash">[]> {
    return this.store.map(({ passwordHash: _, ...rest }) => rest);
  }

  async adminUpdate(id: string, data: { role?: UserRole; disabled?: boolean }): Promise<User | null> {
    const user = this.store.find((u) => u.id === id);
    if (!user) return null;
    if (data.role !== undefined) user.role = data.role;
    if (data.disabled !== undefined) user.disabled = data.disabled;
    return user;
  }
}

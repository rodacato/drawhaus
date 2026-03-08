import crypto from "crypto";
import type { UserRepository } from "../../domain/ports/user-repository";
import type { User } from "../../domain/entities/user";

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
      createdAt: new Date(),
    };
    this.store.push(user);
    return user;
  }
}

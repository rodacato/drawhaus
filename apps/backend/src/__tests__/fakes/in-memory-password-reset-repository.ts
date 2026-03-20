import crypto from "crypto";
import type { PasswordResetRepository } from "../../domain/ports/password-reset-repository";
import type { PasswordResetToken } from "../../domain/entities/password-reset-token";

export class InMemoryPasswordResetRepository implements PasswordResetRepository {
  store: PasswordResetToken[] = [];

  async create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordResetToken> {
    const reset: PasswordResetToken = {
      id: crypto.randomUUID(),
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.store.push(reset);
    return reset;
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return this.store.find((r) => r.token === token) ?? null;
  }

  async markUsed(id: string): Promise<void> {
    const reset = this.store.find((r) => r.id === id);
    if (reset) reset.usedAt = new Date();
  }
}

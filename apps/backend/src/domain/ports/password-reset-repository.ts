import type { PasswordResetToken } from "../entities/password-reset-token";

export interface PasswordResetRepository {
  create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordResetToken>;
  findByToken(token: string): Promise<PasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
}

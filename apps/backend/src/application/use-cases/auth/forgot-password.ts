import crypto from "crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { PasswordResetRepository } from "../../../domain/ports/password-reset-repository";
import type { EmailService } from "../../../domain/ports/email-service";

export class ForgotPasswordUseCase {
  constructor(
    private users: UserRepository,
    private resetTokens: PasswordResetRepository,
    private emailService: EmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user) return; // Don't leak user existence

    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.resetTokens.create({ userId: user.id, token, expiresAt });
    await this.emailService.sendPasswordResetEmail(user.email, token);
  }
}

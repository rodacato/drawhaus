import type { EmailService } from "../../domain/ports/email-service";

export class NoopEmailService implements EmailService {
  async sendInviteEmail(): Promise<void> {}
  async sendPasswordResetEmail(): Promise<void> {}
}

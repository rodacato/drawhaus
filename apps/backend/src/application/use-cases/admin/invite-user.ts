import crypto from "crypto";
import type { UserRepository } from "../../../domain/ports/user-repository";
import type { InvitationRepository } from "../../../domain/ports/invitation-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { EmailService } from "../../../domain/ports/email-service";
import type { UserRole } from "../../../domain/entities/user";
import { ConflictError } from "../../../domain/errors";

export class InviteUserUseCase {
  constructor(
    private users: UserRepository,
    private invitations: InvitationRepository,
    private siteSettings: SiteSettingsRepository,
    private emailService: EmailService,
  ) {}

  async execute(input: { email: string; role: UserRole; invitedBy: string; inviterName: string }) {
    const email = input.email.toLowerCase();

    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.invitations.create({
      email,
      role: input.role,
      token,
      invitedBy: input.invitedBy,
      expiresAt,
    });

    const settings = await this.siteSettings.get();
    await this.emailService.sendInviteEmail(email, token, input.inviterName, settings.instanceName);

    return invitation;
  }
}

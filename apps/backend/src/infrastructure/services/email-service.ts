import { Resend } from "resend";
import { config } from "../config";
import { logger } from "../logger";
import type { EmailService } from "../../domain/ports/email-service";
import type { ConfigProvider } from "./config-provider";

export class ResendEmailService implements EmailService {
  private configProvider: ConfigProvider | null;

  constructor(configProvider?: ConfigProvider) {
    this.configProvider = configProvider ?? null;
  }

  private async getResend(): Promise<{ client: Resend; from: string } | null> {
    const apiKey = this.configProvider
      ? await this.configProvider.get("RESEND_API_KEY")
      : config.resendApiKey;
    const from = this.configProvider
      ? await this.configProvider.get("FROM_EMAIL")
      : config.fromEmail;

    if (!apiKey) return null;
    return { client: new Resend(apiKey), from: from || "noreply@drawhaus.app" };
  }

  async sendInviteEmail(to: string, inviteToken: string, inviterName: string, instanceName: string): Promise<void> {
    const inviteUrl = `${config.frontendUrl}/invite/${inviteToken}`;
    const subject = `You've been invited to ${instanceName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">You're invited!</h2>
        <p style="color: #475569; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join <strong>${instanceName}</strong>.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #0EA5E9; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Accept Invitation
        </a>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Sent by ${instanceName}</p>
      </div>
    `;

    await this.send(to, subject, html, inviteUrl);
  }

  async sendWorkspaceInviteEmail(to: string, inviteToken: string, inviterName: string, workspaceName: string): Promise<void> {
    const inviteUrl = `${config.frontendUrl}/workspace-invite/${inviteToken}`;
    const subject = `You've been invited to the "${workspaceName}" workspace`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Workspace Invitation</h2>
        <p style="color: #475569; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to collaborate on the <strong>${workspaceName}</strong> workspace in Drawhaus.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #0EA5E9; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Accept Invitation
        </a>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Sent by Drawhaus</p>
      </div>
    `;

    await this.send(to, subject, html, inviteUrl);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password/${resetToken}`;
    const subject = "Reset your password";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #475569; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #0EA5E9; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Sent by Drawhaus</p>
      </div>
    `;

    await this.send(to, subject, html, resetUrl);
  }

  private async send(to: string, subject: string, html: string, actionUrl: string): Promise<void> {
    const resend = await this.getResend();
    if (!resend) {
      logger.info({ to, subject, actionUrl }, "[Email] No RESEND_API_KEY set — logging email instead of sending");
      return;
    }

    const { error } = await resend.client.emails.send({ from: resend.from, to, subject, html });
    if (error) {
      logger.error({ to, subject, error }, "Failed to send email via Resend");
      throw new Error(`Failed to send email: ${error.message}`);
    }
    logger.info({ to, subject }, "Email sent successfully");
  }
}

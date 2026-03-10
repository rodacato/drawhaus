export interface EmailService {
  sendInviteEmail(to: string, inviteToken: string, inviterName: string, instanceName: string): Promise<void>;
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
}

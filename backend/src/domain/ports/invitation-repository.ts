import type { Invitation } from "../entities/invitation";
import type { UserRole } from "../entities/user";

export interface InvitationRepository {
  create(data: { email: string; role: UserRole; token: string; invitedBy: string; expiresAt: Date }): Promise<Invitation>;
  findByToken(token: string): Promise<Invitation | null>;
  markUsed(id: string): Promise<void>;
  listPending(): Promise<Invitation[]>;
}

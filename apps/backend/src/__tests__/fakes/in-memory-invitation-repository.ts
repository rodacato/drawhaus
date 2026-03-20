import crypto from "crypto";
import type { InvitationRepository } from "../../domain/ports/invitation-repository";
import type { Invitation } from "../../domain/entities/invitation";
import type { UserRole } from "../../domain/entities/user";

export class InMemoryInvitationRepository implements InvitationRepository {
  store: Invitation[] = [];

  async create(data: { email: string; role: UserRole; token: string; invitedBy: string; expiresAt: Date }): Promise<Invitation> {
    const invitation: Invitation = {
      id: crypto.randomUUID(),
      email: data.email,
      role: data.role,
      token: data.token,
      invitedBy: data.invitedBy,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.store.push(invitation);
    return invitation;
  }

  async findByToken(token: string): Promise<Invitation | null> {
    return this.store.find((i) => i.token === token) ?? null;
  }

  async markUsed(id: string): Promise<void> {
    const inv = this.store.find((i) => i.id === id);
    if (inv) inv.usedAt = new Date();
  }

  async listPending(): Promise<Invitation[]> {
    return this.store.filter((i) => !i.usedAt);
  }
}

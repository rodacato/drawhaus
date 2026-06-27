import crypto from "node:crypto";
import type { WorkspaceInvitationRepository } from "../../domain/ports/workspace-invitation-repository";
import type { WorkspaceInvitation } from "../../domain/entities/workspace-invitation";
import type { WorkspaceRole } from "../../domain/entities/workspace";

export class InMemoryWorkspaceInvitationRepository implements WorkspaceInvitationRepository {
  store: WorkspaceInvitation[] = [];

  async create(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<WorkspaceInvitation> {
    const invitation: WorkspaceInvitation = {
      id: crypto.randomUUID(),
      workspaceId: data.workspaceId,
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

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    return this.store.find((i) => i.token === token) ?? null;
  }

  async markUsed(id: string): Promise<void> {
    const invite = this.store.find((i) => i.id === id);
    if (invite) invite.usedAt = new Date();
  }
}

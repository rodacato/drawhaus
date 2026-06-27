import type { WorkspaceInvitation } from "../entities/workspace-invitation";
import type { WorkspaceRole } from "../entities/workspace";

export interface WorkspaceInvitationRepository {
  create(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<WorkspaceInvitation>;
  findByToken(token: string): Promise<WorkspaceInvitation | null>;
  markUsed(id: string): Promise<void>;
}

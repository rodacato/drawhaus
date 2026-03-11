import type { Workspace, WorkspaceMember, WorkspaceRole } from "../entities/workspace";

export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByUser(userId: string): Promise<Workspace[]>;
  findPersonal(userId: string): Promise<Workspace | null>;
  create(data: { name: string; description?: string; ownerId: string; isPersonal?: boolean; color?: string; icon?: string }): Promise<Workspace>;
  update(id: string, data: Partial<Pick<Workspace, "name" | "description" | "color" | "icon">>): Promise<Workspace | null>;
  delete(id: string): Promise<void>;

  // Members
  findMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null>;
  findMembers(workspaceId: string): Promise<(WorkspaceMember & { userName: string; userEmail: string })[]>;
  addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  countByOwner(userId: string): Promise<number>;
  countMembers(workspaceId: string): Promise<number>;
}

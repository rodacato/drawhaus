import crypto from "crypto";
import type { WorkspaceRepository } from "../../domain/ports/workspace-repository";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "../../domain/entities/workspace";

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  store: Workspace[] = [];
  members: (WorkspaceMember & { userName: string; userEmail: string })[] = [];

  async findById(id: string): Promise<Workspace | null> {
    return this.store.find((w) => w.id === id) ?? null;
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    const memberWorkspaceIds = new Set(
      this.members.filter((m) => m.userId === userId).map((m) => m.workspaceId),
    );
    return this.store.filter((w) => w.ownerId === userId || memberWorkspaceIds.has(w.id));
  }

  async findPersonal(userId: string): Promise<Workspace | null> {
    return this.store.find((w) => w.ownerId === userId && w.isPersonal) ?? null;
  }

  async create(data: { name: string; description?: string; ownerId: string; isPersonal?: boolean; color?: string; icon?: string }): Promise<Workspace> {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description ?? "",
      ownerId: data.ownerId,
      isPersonal: data.isPersonal ?? false,
      color: data.color ?? "#6366f1",
      icon: data.icon ?? "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.push(workspace);
    this.members.push({
      workspaceId: workspace.id,
      userId: data.ownerId,
      role: "admin",
      addedAt: new Date(),
      userName: "Owner",
      userEmail: "owner@test.com",
    });
    return workspace;
  }

  async update(id: string, data: Partial<Pick<Workspace, "name" | "description" | "color" | "icon">>): Promise<Workspace | null> {
    const workspace = this.store.find((w) => w.id === id);
    if (!workspace) return null;
    if (data.name !== undefined) workspace.name = data.name;
    if (data.description !== undefined) workspace.description = data.description;
    if (data.color !== undefined) workspace.color = data.color;
    if (data.icon !== undefined) workspace.icon = data.icon;
    workspace.updatedAt = new Date();
    return workspace;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((w) => w.id !== id);
    this.members = this.members.filter((m) => m.workspaceId !== id);
  }

  async findMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const member = this.members.find((m) => m.workspaceId === workspaceId && m.userId === userId);
    return member?.role ?? null;
  }

  async findMembers(workspaceId: string): Promise<(WorkspaceMember & { userName: string; userEmail: string })[]> {
    return this.members.filter((m) => m.workspaceId === workspaceId);
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    const existing = this.members.find((m) => m.workspaceId === workspaceId && m.userId === userId);
    if (existing) {
      existing.role = role;
    } else {
      this.members.push({
        workspaceId,
        userId,
        role,
        addedAt: new Date(),
        userName: `User ${userId}`,
        userEmail: `${userId}@test.com`,
      });
    }
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    const member = this.members.find((m) => m.workspaceId === workspaceId && m.userId === userId);
    if (member) member.role = role;
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    this.members = this.members.filter((m) => !(m.workspaceId === workspaceId && m.userId === userId));
  }

  async countByOwner(userId: string): Promise<number> {
    return this.store.filter((w) => w.ownerId === userId && !w.isPersonal).length;
  }

  async countMembers(workspaceId: string): Promise<number> {
    return this.members.filter((m) => m.workspaceId === workspaceId).length;
  }

  async transferOwnership(workspaceId: string, newOwnerId: string): Promise<void> {
    const workspace = this.store.find((w) => w.id === workspaceId);
    if (!workspace) return;
    const oldOwnerId = workspace.ownerId;
    workspace.ownerId = newOwnerId;
    workspace.updatedAt = new Date();

    // Ensure new owner is admin
    await this.addMember(workspaceId, newOwnerId, "admin");

    // Demote old owner to admin (keep as member)
    if (oldOwnerId !== newOwnerId) {
      const oldMember = this.members.find((m) => m.workspaceId === workspaceId && m.userId === oldOwnerId);
      if (oldMember) oldMember.role = "admin";
    }
  }

  async findOwnedSharedWorkspaces(userId: string): Promise<Workspace[]> {
    return this.store.filter((w) => {
      if (w.ownerId !== userId || w.isPersonal) return false;
      const memberCount = this.members.filter((m) => m.workspaceId === w.id).length;
      return memberCount > 1;
    });
  }
}

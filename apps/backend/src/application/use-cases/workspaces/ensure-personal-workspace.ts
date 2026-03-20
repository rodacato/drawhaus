import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";

export class EnsurePersonalWorkspaceUseCase {
  constructor(private workspaces: WorkspaceRepository) {}

  async execute(userId: string) {
    const existing = await this.workspaces.findPersonal(userId);
    if (existing) return existing;

    return this.workspaces.create({
      name: "Personal",
      description: "Your private diagrams",
      ownerId: userId,
      isPersonal: true,
      color: "#6366f1",
      icon: "",
    });
  }
}

import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";

export class ListWorkspacesUseCase {
  constructor(private readonly workspaces: WorkspaceRepository) {}

  async execute(userId: string) {
    return this.workspaces.findByUser(userId);
  }
}

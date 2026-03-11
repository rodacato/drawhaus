import type { WorkspaceRepository } from "../../../domain/ports/workspace-repository";
import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import { ForbiddenError } from "../../../domain/errors";

export class CreateWorkspaceUseCase {
  constructor(
    private workspaces: WorkspaceRepository,
    private settings: SiteSettingsRepository,
  ) {}

  async execute(input: { userId: string; name: string; description?: string; color?: string; icon?: string }) {
    const siteSettings = await this.settings.get();
    const count = await this.workspaces.countByOwner(input.userId);
    if (count >= siteSettings.maxWorkspacesPerUser) {
      throw new ForbiddenError();
    }

    return this.workspaces.create({
      name: input.name,
      description: input.description,
      ownerId: input.userId,
      color: input.color,
      icon: input.icon,
    });
  }
}

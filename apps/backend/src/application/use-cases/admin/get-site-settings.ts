import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";

export class GetSiteSettingsUseCase {
  constructor(private readonly settings: SiteSettingsRepository) {}

  async execute() {
    return this.settings.get();
  }
}

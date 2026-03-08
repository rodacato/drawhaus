import type { SiteSettingsRepository } from "../../../domain/ports/site-settings-repository";
import type { SiteSettings } from "../../../domain/entities/site-settings";

export class UpdateSiteSettingsUseCase {
  constructor(private settings: SiteSettingsRepository) {}

  async execute(data: Partial<SiteSettings>) {
    return this.settings.update(data);
  }
}

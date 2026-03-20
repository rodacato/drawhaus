import type { SiteSettings } from "../entities/site-settings";

export interface SiteSettingsRepository {
  get(): Promise<SiteSettings>;
  update(data: Partial<SiteSettings>): Promise<SiteSettings>;
}

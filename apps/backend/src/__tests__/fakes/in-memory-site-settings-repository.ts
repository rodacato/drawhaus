import type { SiteSettingsRepository } from "../../domain/ports/site-settings-repository";
import type { SiteSettings } from "../../domain/entities/site-settings";

const DEFAULTS: SiteSettings = {
  registrationOpen: true,
  instanceName: "Drawhaus",
  maintenanceMode: false,
  maxWorkspacesPerUser: 5,
  maxMembersPerWorkspace: 5,
  setupCompleted: false,
  setupSkippedIntegrations: false,
  backupEnabled: true,
  backupCron: "0 3 * * *",
  backupRetentionDays: 7,
};

export class InMemorySiteSettingsRepository implements SiteSettingsRepository {
  current: SiteSettings = { ...DEFAULTS };

  async get(): Promise<SiteSettings> {
    return { ...this.current };
  }

  async update(data: Partial<SiteSettings>): Promise<SiteSettings> {
    this.current = { ...this.current, ...data };
    return { ...this.current };
  }
}

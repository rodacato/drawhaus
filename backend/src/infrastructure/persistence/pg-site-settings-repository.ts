import type { SiteSettingsRepository } from "../../domain/ports/site-settings-repository";
import type { SiteSettings } from "../../domain/entities/site-settings";
import { pool } from "../db";

type SettingsRow = {
  registration_open: boolean;
  instance_name: string;
};

function toDomain(row: SettingsRow): SiteSettings {
  return {
    registrationOpen: row.registration_open,
    instanceName: row.instance_name,
  };
}

export class PgSiteSettingsRepository implements SiteSettingsRepository {
  async get(): Promise<SiteSettings> {
    const { rows } = await pool.query<SettingsRow>(
      "SELECT registration_open, instance_name FROM site_settings WHERE id = true LIMIT 1",
    );
    return rows[0] ? toDomain(rows[0]) : { registrationOpen: true, instanceName: "Drawhaus" };
  }

  async update(data: Partial<SiteSettings>): Promise<SiteSettings> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.registrationOpen !== undefined) {
      updates.push(`registration_open = $${index}`);
      values.push(data.registrationOpen);
      index += 1;
    }
    if (data.instanceName !== undefined) {
      updates.push(`instance_name = $${index}`);
      values.push(data.instanceName);
      index += 1;
    }

    if (updates.length === 0) return this.get();

    const { rows } = await pool.query<SettingsRow>(
      `UPDATE site_settings SET ${updates.join(", ")} WHERE id = true
       RETURNING registration_open, instance_name`,
      values,
    );
    return toDomain(rows[0]);
  }
}

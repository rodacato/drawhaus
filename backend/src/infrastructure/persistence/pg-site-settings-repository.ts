import type { SiteSettingsRepository } from "../../domain/ports/site-settings-repository";
import type { SiteSettings } from "../../domain/entities/site-settings";
import { pool } from "../db";

type SettingsRow = {
  registration_open: boolean;
  instance_name: string;
  max_workspaces_per_user: number;
  max_members_per_workspace: number;
};

const COLS = "registration_open, instance_name, max_workspaces_per_user, max_members_per_workspace";

function toDomain(row: SettingsRow): SiteSettings {
  return {
    registrationOpen: row.registration_open,
    instanceName: row.instance_name,
    maxWorkspacesPerUser: row.max_workspaces_per_user,
    maxMembersPerWorkspace: row.max_members_per_workspace,
  };
}

export class PgSiteSettingsRepository implements SiteSettingsRepository {
  async get(): Promise<SiteSettings> {
    const { rows } = await pool.query<SettingsRow>(
      `SELECT ${COLS} FROM site_settings WHERE id = true LIMIT 1`,
    );
    return rows[0] ? toDomain(rows[0]) : { registrationOpen: true, instanceName: "Drawhaus", maxWorkspacesPerUser: 5, maxMembersPerWorkspace: 5 };
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
    if (data.maxWorkspacesPerUser !== undefined) {
      updates.push(`max_workspaces_per_user = $${index}`);
      values.push(data.maxWorkspacesPerUser);
      index += 1;
    }
    if (data.maxMembersPerWorkspace !== undefined) {
      updates.push(`max_members_per_workspace = $${index}`);
      values.push(data.maxMembersPerWorkspace);
      index += 1;
    }

    if (updates.length === 0) return this.get();

    const { rows } = await pool.query<SettingsRow>(
      `UPDATE site_settings SET ${updates.join(", ")} WHERE id = true
       RETURNING ${COLS}`,
      values,
    );
    return toDomain(rows[0]);
  }
}

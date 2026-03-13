import type { SiteSettingsRepository } from "../../domain/ports/site-settings-repository";
import type { SiteSettings } from "../../domain/entities/site-settings";
import { pool } from "../db";

type SettingsRow = {
  registration_open: boolean;
  instance_name: string;
  maintenance_mode: boolean;
  max_workspaces_per_user: number;
  max_members_per_workspace: number;
  setup_completed: boolean;
  setup_skipped_integrations: boolean;
};

const COLS = "registration_open, instance_name, maintenance_mode, max_workspaces_per_user, max_members_per_workspace, setup_completed, setup_skipped_integrations";

function toDomain(row: SettingsRow): SiteSettings {
  return {
    registrationOpen: row.registration_open,
    instanceName: row.instance_name,
    maintenanceMode: row.maintenance_mode,
    maxWorkspacesPerUser: row.max_workspaces_per_user,
    maxMembersPerWorkspace: row.max_members_per_workspace,
    setupCompleted: row.setup_completed,
    setupSkippedIntegrations: row.setup_skipped_integrations,
  };
}

export class PgSiteSettingsRepository implements SiteSettingsRepository {
  async get(): Promise<SiteSettings> {
    const { rows } = await pool.query<SettingsRow>(
      `SELECT ${COLS} FROM site_settings WHERE id = true LIMIT 1`,
    );
    return rows[0] ? toDomain(rows[0]) : { registrationOpen: true, instanceName: "Drawhaus", maintenanceMode: false, maxWorkspacesPerUser: 5, maxMembersPerWorkspace: 5, setupCompleted: false, setupSkippedIntegrations: false };
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
    if (data.maintenanceMode !== undefined) {
      updates.push(`maintenance_mode = $${index}`);
      values.push(data.maintenanceMode);
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
    if (data.setupCompleted !== undefined) {
      updates.push(`setup_completed = $${index}`);
      values.push(data.setupCompleted);
      index += 1;
    }
    if (data.setupSkippedIntegrations !== undefined) {
      updates.push(`setup_skipped_integrations = $${index}`);
      values.push(data.setupSkippedIntegrations);
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

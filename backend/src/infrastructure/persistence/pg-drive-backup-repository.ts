import type { DriveBackupRepository } from "../../domain/ports/drive-backup-repository";
import type { DriveBackupSettings, DriveFileMapping } from "../../domain/entities/drive-backup";
import { pool } from "../db";

type SettingsRow = {
  user_id: string;
  enabled: boolean;
  root_folder_id: string | null;
  created_at: string;
  updated_at: string;
};

type MappingRow = {
  id: string;
  user_id: string;
  diagram_id: string;
  scene_id: string | null;
  drive_file_id: string;
  drive_folder_id: string;
  last_synced_at: string;
};

function toSettings(row: SettingsRow): DriveBackupSettings {
  return {
    userId: row.user_id,
    enabled: row.enabled,
    rootFolderId: row.root_folder_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toMapping(row: MappingRow): DriveFileMapping {
  return {
    id: row.id,
    userId: row.user_id,
    diagramId: row.diagram_id,
    sceneId: row.scene_id,
    driveFileId: row.drive_file_id,
    driveFolderId: row.drive_folder_id,
    lastSyncedAt: new Date(row.last_synced_at),
  };
}

export class PgDriveBackupRepository implements DriveBackupRepository {
  async getSettings(userId: string): Promise<DriveBackupSettings | null> {
    const { rows } = await pool.query<SettingsRow>(
      `SELECT * FROM drive_backup_settings WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ? toSettings(rows[0]) : null;
  }

  async upsertSettings(userId: string, data: { enabled: boolean; rootFolderId?: string | null }): Promise<DriveBackupSettings> {
    const { rows } = await pool.query<SettingsRow>(
      `INSERT INTO drive_backup_settings (user_id, enabled, root_folder_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         root_folder_id = COALESCE(EXCLUDED.root_folder_id, drive_backup_settings.root_folder_id),
         updated_at = now()
       RETURNING *`,
      [userId, data.enabled, data.rootFolderId ?? null],
    );
    return toSettings(rows[0]);
  }

  async deleteSettings(userId: string): Promise<void> {
    await pool.query(`DELETE FROM drive_backup_settings WHERE user_id = $1`, [userId]);
  }

  async getFileMapping(userId: string, diagramId: string, sceneId: string | null): Promise<DriveFileMapping | null> {
    const { rows } = await pool.query<MappingRow>(
      sceneId
        ? `SELECT * FROM drive_file_mappings WHERE user_id = $1 AND diagram_id = $2 AND scene_id = $3`
        : `SELECT * FROM drive_file_mappings WHERE user_id = $1 AND diagram_id = $2 AND scene_id IS NULL`,
      sceneId ? [userId, diagramId, sceneId] : [userId, diagramId],
    );
    return rows[0] ? toMapping(rows[0]) : null;
  }

  async upsertFileMapping(data: {
    userId: string;
    diagramId: string;
    sceneId: string | null;
    driveFileId: string;
    driveFolderId: string;
  }): Promise<DriveFileMapping> {
    const { rows } = await pool.query<MappingRow>(
      `INSERT INTO drive_file_mappings (user_id, diagram_id, scene_id, drive_file_id, drive_folder_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, diagram_id, scene_id) DO UPDATE SET
         drive_file_id = EXCLUDED.drive_file_id,
         drive_folder_id = EXCLUDED.drive_folder_id,
         last_synced_at = now()
       RETURNING *`,
      [data.userId, data.diagramId, data.sceneId, data.driveFileId, data.driveFolderId],
    );
    return toMapping(rows[0]);
  }

  async deleteFileMappings(userId: string, diagramId: string): Promise<void> {
    await pool.query(
      `DELETE FROM drive_file_mappings WHERE user_id = $1 AND diagram_id = $2`,
      [userId, diagramId],
    );
  }
}

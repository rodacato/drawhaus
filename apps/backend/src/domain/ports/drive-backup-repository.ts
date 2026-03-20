import type { DriveBackupSettings, DriveFileMapping } from "../entities/drive-backup";

export interface DriveBackupRepository {
  getSettings(userId: string): Promise<DriveBackupSettings | null>;
  upsertSettings(userId: string, data: { enabled: boolean; rootFolderId?: string | null }): Promise<DriveBackupSettings>;
  deleteSettings(userId: string): Promise<void>;

  getFileMapping(userId: string, diagramId: string, sceneId: string | null): Promise<DriveFileMapping | null>;
  upsertFileMapping(data: {
    userId: string;
    diagramId: string;
    sceneId: string | null;
    driveFileId: string;
    driveFolderId: string;
  }): Promise<DriveFileMapping>;
  deleteFileMappings(userId: string, diagramId: string): Promise<void>;
}

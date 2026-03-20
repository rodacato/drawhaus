export type DriveBackupSettings = {
  userId: string;
  enabled: boolean;
  rootFolderId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DriveFileMapping = {
  id: string;
  userId: string;
  diagramId: string;
  sceneId: string | null;
  driveFileId: string;
  driveFolderId: string;
  lastSyncedAt: Date;
};

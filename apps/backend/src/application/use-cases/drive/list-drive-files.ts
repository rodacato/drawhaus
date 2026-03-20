import type { GoogleDriveService, DriveFileListItem } from "../../../domain/ports/google-drive-service";
import type { DriveBackupRepository } from "../../../domain/ports/drive-backup-repository";
import type { GoogleTokenRefresher } from "../../../infrastructure/services/google-token-refresh";

type DriveFileBrowseItem = DriveFileListItem & { isFolder: boolean };

export class ListDriveFilesUseCase {
  constructor(
    private driveService: GoogleDriveService,
    private driveBackupRepo: DriveBackupRepository,
    private tokenRefresher: GoogleTokenRefresher,
  ) {}

  async execute(userId: string, folderId?: string): Promise<{ files: DriveFileBrowseItem[]; currentFolderId: string }> {
    const accessToken = await this.tokenRefresher.getValidAccessToken(userId);

    // Default to the Drawhaus Backups root folder
    let targetFolderId = folderId;
    if (!targetFolderId) {
      const settings = await this.driveBackupRepo.getSettings(userId);
      if (settings?.rootFolderId) {
        targetFolderId = settings.rootFolderId;
      } else {
        // Try to find the folder
        const folder = await this.driveService.findFolder(accessToken, "Drawhaus Backups", null);
        if (folder) {
          targetFolderId = folder.id;
        } else {
          return { files: [], currentFolderId: "" };
        }
      }
    }

    const files = await this.driveService.listFiles(accessToken, targetFolderId);

    const result: DriveFileBrowseItem[] = files.map((f) => ({
      ...f,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }));

    // Sort: folders first, then files by modifiedTime desc
    result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return 0;
    });

    return { files: result, currentFolderId: targetFolderId };
  }
}

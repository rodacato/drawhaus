import type { GoogleDriveService } from "../../../domain/ports/google-drive-service";
import type { DriveBackupRepository } from "../../../domain/ports/drive-backup-repository";
import type { DiagramRepository } from "../../../domain/ports/diagram-repository";
import type { FolderRepository } from "../../../domain/ports/folder-repository";
import type { GoogleTokenRefresher } from "../../../infrastructure/services/google-token-refresh";
import { logger } from "../../../infrastructure/logger";

export class SyncToDriveUseCase {
  constructor(
    private driveService: GoogleDriveService,
    private driveBackupRepo: DriveBackupRepository,
    private tokenRefresher: GoogleTokenRefresher,
    private diagrams: DiagramRepository,
    private folders: FolderRepository,
  ) {}

  async execute(
    ownerId: string,
    diagramId: string,
    sceneId: string | null,
    elements: unknown[],
    appState: Record<string, unknown>,
  ): Promise<{ synced: boolean; error?: string }> {
    try {
      const settings = await this.driveBackupRepo.getSettings(ownerId);
      if (!settings?.enabled) return { synced: false };

      const accessToken = await this.tokenRefresher.getValidAccessToken(ownerId);

      // Ensure root folder
      let rootFolderId = settings.rootFolderId;
      if (!rootFolderId) {
        const rootFolder = await this.driveService.ensureFolder(accessToken, "Drawhaus Backups", null);
        rootFolderId = rootFolder.id;
        await this.driveBackupRepo.upsertSettings(ownerId, { enabled: true, rootFolderId });
      }

      // Get diagram info
      const diagram = await this.diagrams.findById(diagramId);
      if (!diagram) return { synced: false, error: "Diagram not found" };

      // Determine subfolder name
      let subfolderName = "Unfiled";
      if (diagram.folderId) {
        const folder = await this.folders.findById(diagram.folderId);
        if (folder) subfolderName = folder.name;
      }

      const subfolder = await this.driveService.ensureFolder(accessToken, subfolderName, rootFolderId);

      // Build .excalidraw JSON
      const excalidrawData = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "drawhaus",
        elements,
        appState: { ...appState, collaborators: undefined },
      }, null, 2);

      const fileName = `${diagram.title || "Untitled"}.excalidraw`;

      // Check for existing mapping
      const mapping = await this.driveBackupRepo.getFileMapping(ownerId, diagramId, sceneId);

      const driveFile = await this.driveService.uploadFile(accessToken, {
        name: fileName,
        mimeType: "application/json",
        content: excalidrawData,
        folderId: subfolder.id,
        existingFileId: mapping?.driveFileId,
      });

      await this.driveBackupRepo.upsertFileMapping({
        userId: ownerId,
        diagramId,
        sceneId,
        driveFileId: driveFile.id,
        driveFolderId: subfolder.id,
      });

      return { synced: true };
    } catch (err) {
      logger.warn({ err, ownerId, diagramId }, "Drive sync failed");
      return { synced: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}

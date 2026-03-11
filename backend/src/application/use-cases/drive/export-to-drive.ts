import type { GoogleDriveService } from "../../../domain/ports/google-drive-service";
import type { GoogleTokenRefresher } from "../../../infrastructure/services/google-token-refresh";

export class ExportToDriveUseCase {
  constructor(
    private driveService: GoogleDriveService,
    private tokenRefresher: GoogleTokenRefresher,
  ) {}

  async execute(userId: string, data: {
    format: "excalidraw" | "png" | "svg";
    targetFolderId: string;
    content: string;
    fileName: string;
  }): Promise<{ driveFileId: string; webViewLink: string }> {
    const accessToken = await this.tokenRefresher.getValidAccessToken(userId);

    const mimeType = data.format === "png" ? "image/png"
      : data.format === "svg" ? "image/svg+xml"
      : "application/json";

    const file = await this.driveService.uploadFile(accessToken, {
      name: data.fileName,
      mimeType,
      content: data.content,
      folderId: data.targetFolderId,
    });

    return { driveFileId: file.id, webViewLink: file.webViewLink };
  }
}

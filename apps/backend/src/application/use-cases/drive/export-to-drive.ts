import type { GoogleDriveService } from "../../../domain/ports/google-drive-service";
import type { TokenRefresherPort } from "../../../domain/ports/token-refresher";

type ExportFormat = "excalidraw" | "png" | "svg";

const MIME_TYPES: Record<ExportFormat, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  excalidraw: "application/json",
};

export class ExportToDriveUseCase {
  constructor(
    private readonly driveService: GoogleDriveService,
    private readonly tokenRefresher: TokenRefresherPort,
  ) {}

  async execute(userId: string, data: {
    format: ExportFormat;
    targetFolderId: string;
    content: string;
    fileName: string;
  }): Promise<{ driveFileId: string; webViewLink: string }> {
    const accessToken = await this.tokenRefresher.getValidAccessToken(userId);

    const mimeType = MIME_TYPES[data.format];

    const file = await this.driveService.uploadFile(accessToken, {
      name: data.fileName,
      mimeType,
      content: data.content,
      folderId: data.targetFolderId,
    });

    return { driveFileId: file.id, webViewLink: file.webViewLink };
  }
}

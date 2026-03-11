import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { DriveBackupRepository } from "../../../domain/ports/drive-backup-repository";
import { DriveTokenError } from "../../../domain/errors";

export class ToggleDriveBackupUseCase {
  constructor(
    private driveBackupRepo: DriveBackupRepository,
    private oauthTokens: OAuthTokenRepository,
  ) {}

  async execute(userId: string, enabled: boolean): Promise<{ enabled: boolean }> {
    if (enabled) {
      const token = await this.oauthTokens.findByUserAndProvider(userId, "google");
      if (!token || !token.scopes.includes("drive.file")) {
        throw new DriveTokenError("Google Drive scope not granted. Please connect Google Drive first.");
      }
    }

    await this.driveBackupRepo.upsertSettings(userId, { enabled });
    return { enabled };
  }
}

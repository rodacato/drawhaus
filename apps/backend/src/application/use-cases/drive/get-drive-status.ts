import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import type { DriveBackupRepository } from "../../../domain/ports/drive-backup-repository";

export class GetDriveStatusUseCase {
  constructor(
    private oauthTokens: OAuthTokenRepository,
    private driveBackupRepo: DriveBackupRepository,
  ) {}

  async execute(userId: string): Promise<{
    connected: boolean;
    autoBackupEnabled: boolean;
    scopes: string;
  }> {
    const token = await this.oauthTokens.findByUserAndProvider(userId, "google");
    const hasDriveScope = !!token && token.scopes.includes("drive.file");

    const settings = await this.driveBackupRepo.getSettings(userId);

    return {
      connected: hasDriveScope,
      autoBackupEnabled: hasDriveScope && (settings?.enabled ?? false),
      scopes: token?.scopes ?? "",
    };
  }
}

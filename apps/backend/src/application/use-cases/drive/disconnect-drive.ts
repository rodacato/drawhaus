import type { DriveBackupRepository } from "../../../domain/ports/drive-backup-repository";

export class DisconnectDriveUseCase {
  constructor(
    private driveBackupRepo: DriveBackupRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.driveBackupRepo.deleteSettings(userId);
  }
}

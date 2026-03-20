import cron from "node-cron";
import { createBackup, cleanupOldBackups, getBackupConfig } from "./backup-service";
import { logger } from "../logger";

let task: cron.ScheduledTask | null = null;

export async function startBackupScheduler(): Promise<void> {
  // Stop existing scheduler if running (for restarts on config change)
  stopBackupScheduler();

  const { schedule, enabled } = await getBackupConfig();

  if (!enabled) {
    logger.info("Backup scheduler disabled");
    return;
  }

  if (!cron.validate(schedule)) {
    logger.error({ schedule }, "Invalid backup cron expression, scheduler not started");
    return;
  }

  task = cron.schedule(schedule, async () => {
    logger.info("Starting scheduled backup...");
    try {
      const result = await createBackup();
      logger.info({ filename: result.filename, size: result.size, durationMs: result.durationMs }, "Backup completed");

      const currentConfig = await getBackupConfig();
      const deleted = await cleanupOldBackups(currentConfig.retentionDays);
      if (deleted.length > 0) {
        logger.info({ deleted }, "Old backups cleaned up");
      }
    } catch (err) {
      logger.error(err, "Scheduled backup failed");
    }
  });

  logger.info({ schedule }, "Backup scheduler started");
}

export function stopBackupScheduler(): void {
  if (task) {
    task.stop();
    task = null;
  }
}

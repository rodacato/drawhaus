import cron from "node-cron";
import { createBackup, cleanupOldBackups, getBackupConfig } from "./backup-service";
import { logger } from "../logger";

let task: cron.ScheduledTask | null = null;

export function startBackupScheduler(): void {
  const { schedule, enabled } = getBackupConfig();

  if (!enabled) {
    logger.info("Backup scheduler disabled (BACKUP_ENABLED=false)");
    return;
  }

  if (!cron.validate(schedule)) {
    logger.error({ schedule }, "Invalid BACKUP_CRON expression, scheduler not started");
    return;
  }

  task = cron.schedule(schedule, async () => {
    logger.info("Starting scheduled backup...");
    try {
      const result = await createBackup();
      logger.info({ filename: result.filename, size: result.size, durationMs: result.durationMs }, "Backup completed");

      const deleted = await cleanupOldBackups();
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

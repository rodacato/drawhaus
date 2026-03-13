/**
 * Database restore from backup
 *
 * Usage:
 *   npm run db:restore --workspace=backend -- <filename>
 *   npm run db:restore --workspace=backend -- drawhaus_2026-03-13T03-00-00.sql.gz
 *   npm run db:restore --workspace=backend -- latest
 *
 * Pass "latest" to restore the most recent backup.
 */

import { restoreBackup, listBackups, getBackupConfig } from "../infrastructure/services/backup-service";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npm run db:restore --workspace=backend -- <filename|latest>");
    console.error("\nAvailable backups:");
    const backups = await listBackups();
    if (backups.length === 0) {
      console.error("  (none)");
    } else {
      backups.forEach((b) => {
        console.error(`  ${b.filename}  (${(b.size / 1024).toFixed(1)} KB, ${b.createdAt.toISOString()})`);
      });
    }
    process.exit(1);
  }

  let filename = arg;
  if (filename === "latest") {
    const backups = await listBackups();
    if (backups.length === 0) {
      console.error("❌ No backups found");
      process.exit(1);
    }
    filename = backups[0].filename;
  }

  const cfg = getBackupConfig();
  console.log(`🔄 Restoring from: ${cfg.backupDir}/${filename}`);
  console.log("   ⚠️  This will overwrite the current database!\n");

  await restoreBackup(filename);

  console.log("✅ Database restored successfully");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Restore failed:", err.message);
  process.exit(1);
});

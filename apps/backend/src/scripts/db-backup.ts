/**
 * On-demand database backup
 *
 * Usage:
 *   npm run db:backup --workspace=backend
 */

import { createBackup, cleanupOldBackups, getBackupConfig } from "../infrastructure/services/backup-service";

async function main() {
  const cfg = await getBackupConfig();
  console.log(`📦 Creating backup → ${cfg.backupDir}`);
  console.log(`   Retention: ${cfg.retentionDays} days\n`);

  const result = await createBackup();
  console.log(`  ✓ ${result.filename}`);
  console.log(`    Size: ${(result.size / 1024).toFixed(1)} KB`);
  console.log(`    Duration: ${result.durationMs}ms\n`);

  const deleted = await cleanupOldBackups(cfg.retentionDays);
  if (deleted.length > 0) {
    console.log(`  🗑️  Cleaned up ${deleted.length} old backup(s):`);
    deleted.forEach((f) => console.log(`     - ${f}`));
  }

  console.log("\n✅ Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Backup failed:", err.message);
  process.exit(1);
});

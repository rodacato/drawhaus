import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Must be imported BEFORE admin.routes (which loads backup-service that
// captures BACKUP_DIR at module load time). The default "/data/backups"
// is not writable in CI; redirect to an OS temp dir per process.
const TEST_BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "drawhaus-admin-test-"));
process.env.BACKUP_PATH = TEST_BACKUP_DIR;
// Force backup-scheduler to short-circuit (no real cron) when the route
// dynamically imports it after a backup config change.
process.env.BACKUP_ENABLED = "false";

export const ADMIN_TEST_BACKUP_DIR = TEST_BACKUP_DIR;

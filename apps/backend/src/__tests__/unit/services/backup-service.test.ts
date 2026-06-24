import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// BACKUP_DIR in backup-service.ts is captured at module load from process.env.BACKUP_PATH.
// We pin it to a stable tmpdir BEFORE the first require() of the module so all
// fs-touching functions operate on a real isolated directory we can populate per test.
const BACKUP_ROOT = path.join(os.tmpdir(), `drawhaus-backup-svc-test-${process.pid}`);
process.env.BACKUP_PATH = BACKUP_ROOT;

const ORIGINAL_ENV: Record<string, string | undefined> = {
  BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS,
  BACKUP_CRON: process.env.BACKUP_CRON,
  BACKUP_ENABLED: process.env.BACKUP_ENABLED,
};

// CommonJS require() preserves source order, unlike hoisted ESM/TS imports.
// Required so BACKUP_PATH is set before the module's top-level const reads it.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const backupService = require("../../../infrastructure/services/backup-service") as typeof import("../../../infrastructure/services/backup-service");
const {
  parseConnectionString,
  ensureBackupDir,
  listBackups,
  deleteBackup,
  cleanupOldBackups,
  getBackupConfig,
} = backupService;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { pool } = require("../../../infrastructure/db") as typeof import("../../../infrastructure/db");

type QueryFn = typeof pool.query;
let originalQuery: QueryFn;

before(() => {
  originalQuery = pool.query.bind(pool) as QueryFn;
});

after(async () => {
  (pool as unknown as { query: QueryFn }).query = originalQuery;
  await fs.rm(BACKUP_ROOT, { recursive: true, force: true });
});

beforeEach(async () => {
  // Wipe & recreate the backup dir each test for isolation.
  await fs.rm(BACKUP_ROOT, { recursive: true, force: true });
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
});

afterEach(() => {
  // Restore pool.query in case a test overrode it.
  (pool as unknown as { query: QueryFn }).query = originalQuery;
  for (const key of Object.keys(ORIGINAL_ENV) as Array<keyof typeof ORIGINAL_ENV>) {
    if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL_ENV[key];
  }
});

async function writeBackupFile(name: string, contents = "data"): Promise<string> {
  const fullPath = path.join(BACKUP_ROOT, name);
  await fs.writeFile(fullPath, contents);
  return fullPath;
}

async function setMtime(file: string, ageMs: number): Promise<void> {
  const t = new Date(Date.now() - ageMs);
  await fs.utimes(file, t, t);
}

describe("parseConnectionString", () => {
  it("parses a standard postgres URL", () => {
    const result = parseConnectionString("postgres://user:pass@db.host:5433/mydb");
    assert.equal(result.host, "db.host");
    assert.equal(result.port, "5433");
    assert.equal(result.user, "user");
    assert.equal(result.password, "pass");
    assert.equal(result.database, "mydb");
  });

  it("URL-decodes the password", () => {
    const url = "postgres://user:p%40ssw%2Frd@db.host:5432/mydb";
    const result = parseConnectionString(url);
    assert.equal(result.password, "p@ssw/rd");
  });

  it("defaults port to 5432 when omitted", () => {
    const result = parseConnectionString("postgres://user:pass@db.host/mydb");
    assert.equal(result.port, "5432");
    assert.equal(result.host, "db.host");
    assert.equal(result.database, "mydb");
  });
});

describe("ensureBackupDir", () => {
  it("creates the backup directory when it does not exist", async () => {
    await fs.rm(BACKUP_ROOT, { recursive: true, force: true });
    await ensureBackupDir();
    const stat = await fs.stat(BACKUP_ROOT);
    assert.ok(stat.isDirectory());
  });

  it("is idempotent when the directory already exists", async () => {
    await ensureBackupDir();
    await assert.doesNotReject(() => ensureBackupDir());
  });
});

describe("listBackups", () => {
  it("returns an empty array when there are no backups", async () => {
    const backups = await listBackups();
    assert.deepEqual(backups, []);
  });

  it("returns only .sql.gz files, filtering out other extensions", async () => {
    await writeBackupFile("drawhaus_2026-01-01.sql.gz");
    await writeBackupFile("drawhaus_2026-01-02.sql.gz");
    await writeBackupFile("README.txt");
    await writeBackupFile("notes.sql");
    await writeBackupFile("dump.gz");

    const backups = await listBackups();

    assert.equal(backups.length, 2);
    const names = backups.map((b) => b.filename).sort();
    assert.deepEqual(names, ["drawhaus_2026-01-01.sql.gz", "drawhaus_2026-01-02.sql.gz"]);
  });

  it("sorts results newest first by mtime", async () => {
    const older = await writeBackupFile("older.sql.gz");
    const newer = await writeBackupFile("newer.sql.gz");
    await setMtime(older, 10 * 60 * 1000); // 10 minutes ago
    await setMtime(newer, 60 * 1000); // 1 minute ago

    const backups = await listBackups();

    assert.equal(backups.length, 2);
    assert.equal(backups[0].filename, "newer.sql.gz");
    assert.equal(backups[1].filename, "older.sql.gz");
  });

  it("populates size and createdAt metadata", async () => {
    const file = await writeBackupFile("meta.sql.gz", "twelve-bytes");
    const stat = await fs.stat(file);

    const [backup] = await listBackups();

    assert.equal(backup.filename, "meta.sql.gz");
    assert.equal(backup.size, stat.size);
    assert.ok(backup.createdAt instanceof Date);
    assert.equal(backup.createdAt.getTime(), stat.mtime.getTime());
  });
});

describe("deleteBackup", () => {
  it("removes the file from BACKUP_DIR", async () => {
    const file = await writeBackupFile("to-delete.sql.gz");
    await assert.doesNotReject(() => fs.access(file));

    await deleteBackup("to-delete.sql.gz");

    await assert.rejects(() => fs.access(file));
  });

  it("rejects when the file does not exist", async () => {
    await assert.rejects(
      () => deleteBackup("missing.sql.gz"),
      (err: unknown) => (err as { code?: string }).code === "ENOENT",
    );
  });
});

describe("cleanupOldBackups", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("deletes files older than the retention cutoff", async () => {
    const old1 = await writeBackupFile("old1.sql.gz");
    const old2 = await writeBackupFile("old2.sql.gz");
    const fresh = await writeBackupFile("fresh.sql.gz");
    await setMtime(old1, 10 * DAY_MS);
    await setMtime(old2, 15 * DAY_MS);
    await setMtime(fresh, 1 * DAY_MS);

    const deleted = await cleanupOldBackups(7);

    assert.equal(deleted.length, 2);
    assert.deepEqual(deleted.sort(), ["old1.sql.gz", "old2.sql.gz"]);
    await assert.rejects(() => fs.access(old1));
    await assert.rejects(() => fs.access(old2));
    await assert.doesNotReject(() => fs.access(fresh));
  });

  it("keeps files newer than the retention cutoff", async () => {
    const fresh = await writeBackupFile("keep.sql.gz");
    await setMtime(fresh, 2 * DAY_MS);

    const deleted = await cleanupOldBackups(7);

    assert.deepEqual(deleted, []);
    await assert.doesNotReject(() => fs.access(fresh));
  });

  it("defaults retention to 7 days when neither arg nor env are set", async () => {
    delete process.env.BACKUP_RETENTION_DAYS;
    const oldFile = await writeBackupFile("old.sql.gz");
    const newFile = await writeBackupFile("new.sql.gz");
    await setMtime(oldFile, 8 * DAY_MS);
    await setMtime(newFile, 6 * DAY_MS);

    const deleted = await cleanupOldBackups();

    assert.deepEqual(deleted, ["old.sql.gz"]);
  });

  it("uses BACKUP_RETENTION_DAYS env var when arg is omitted", async () => {
    process.env.BACKUP_RETENTION_DAYS = "3";
    const oldFile = await writeBackupFile("old.sql.gz");
    const newFile = await writeBackupFile("new.sql.gz");
    await setMtime(oldFile, 4 * DAY_MS);
    await setMtime(newFile, 2 * DAY_MS);

    const deleted = await cleanupOldBackups();

    assert.deepEqual(deleted, ["old.sql.gz"]);
  });
});

describe("getBackupConfig", () => {
  function stubPoolQuery(handler: (sql: string) => { rows: unknown[] } | Promise<{ rows: unknown[] }>): void {
    (pool as unknown as { query: (sql: string) => Promise<{ rows: unknown[] }> }).query = async (sql: string) => {
      const result = handler(sql);
      return result instanceof Promise ? result : Promise.resolve(result);
    };
  }

  it("returns DB values when pool.query returns a row", async () => {
    stubPoolQuery(() => ({
      rows: [{ backup_enabled: true, backup_cron: "0 4 * * *", backup_retention_days: 30 }],
    }));

    const cfg = await getBackupConfig();

    assert.equal(cfg.enabled, true);
    assert.equal(cfg.schedule, "0 4 * * *");
    assert.equal(cfg.retentionDays, 30);
    assert.equal(cfg.backupDir, BACKUP_ROOT);
  });

  it("respects backup_enabled=false from the DB", async () => {
    stubPoolQuery(() => ({
      rows: [{ backup_enabled: false, backup_cron: "0 5 * * *", backup_retention_days: 14 }],
    }));

    const cfg = await getBackupConfig();

    assert.equal(cfg.enabled, false);
    assert.equal(cfg.schedule, "0 5 * * *");
    assert.equal(cfg.retentionDays, 14);
  });

  it("falls back to env vars when pool.query throws", async () => {
    stubPoolQuery(() => {
      throw new Error("db down");
    });
    process.env.BACKUP_ENABLED = "true";
    process.env.BACKUP_CRON = "*/10 * * * *";
    process.env.BACKUP_RETENTION_DAYS = "21";

    const cfg = await getBackupConfig();

    assert.equal(cfg.enabled, true);
    assert.equal(cfg.schedule, "*/10 * * * *");
    assert.equal(cfg.retentionDays, 21);
  });

  it("falls back to env vars when pool.query returns no rows", async () => {
    stubPoolQuery(() => ({ rows: [] }));
    process.env.BACKUP_ENABLED = "false";
    process.env.BACKUP_CRON = "30 2 * * *";
    process.env.BACKUP_RETENTION_DAYS = "5";

    const cfg = await getBackupConfig();

    assert.equal(cfg.enabled, false);
    assert.equal(cfg.schedule, "30 2 * * *");
    assert.equal(cfg.retentionDays, 5);
  });

  it("env fallback: BACKUP_ENABLED unset defaults to true", async () => {
    stubPoolQuery(() => ({ rows: [] }));
    delete process.env.BACKUP_ENABLED;

    const cfg = await getBackupConfig();

    assert.equal(cfg.enabled, true);
  });

  it("env fallback: BACKUP_CRON unset defaults to '0 3 * * *'", async () => {
    stubPoolQuery(() => ({ rows: [] }));
    delete process.env.BACKUP_CRON;

    const cfg = await getBackupConfig();

    assert.equal(cfg.schedule, "0 3 * * *");
  });

  it("env fallback: BACKUP_RETENTION_DAYS unset defaults to 7", async () => {
    stubPoolQuery(() => ({ rows: [] }));
    delete process.env.BACKUP_RETENTION_DAYS;

    const cfg = await getBackupConfig();

    assert.equal(cfg.retentionDays, 7);
  });
});

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createWriteStream, createReadStream, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";
import { config } from "../config";

export interface BackupMeta {
  filename: string;
  size: number;
  createdAt: Date;
}

export interface BackupResult {
  filename: string;
  size: number;
  durationMs: number;
}

const BACKUP_DIR = process.env.BACKUP_PATH ?? "/data/backups";
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS) || 7;

function parseConnectionString(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
  };
}

/** Find pg_dump/psql — prefer versioned path (dev containers) over PATH default */
function findPgBin(name: string): string {
  for (const ver of [16, 17, 15]) {
    const p = `/usr/lib/postgresql/${ver}/bin/${name}`;
    if (existsSync(p)) return p;
  }
  return name; // fall back to PATH
}

export async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

export async function createBackup(): Promise<BackupResult> {
  const start = Date.now();
  await ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `drawhaus_${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  const conn = parseConnectionString(config.databaseUrl);
  const pgDump = findPgBin("pg_dump");

  const dump = spawn(pgDump, [
    "-h", conn.host,
    "-p", conn.port,
    "-U", conn.user,
    "-d", conn.database,
    "--no-owner",
    "--no-privileges",
    "--clean",
    "--if-exists",
    "--format=plain",
  ], {
    env: { ...process.env, PGPASSWORD: conn.password },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const gzip = createGzip({ level: 6 });
  const output = createWriteStream(filepath);

  let stderr = "";
  dump.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

  const exitPromise = new Promise<number>((resolve, reject) => {
    dump.on("close", (code) => resolve(code ?? 1));
    dump.on("error", reject);
  });

  // Wait for the full pipeline (stream → gzip → file) to flush
  await pipeline(dump.stdout, gzip, output);
  const exitCode = await exitPromise;

  if (exitCode !== 0) {
    await fs.unlink(filepath).catch(() => {});
    throw new Error(`pg_dump failed (exit ${exitCode}): ${stderr}`);
  }

  const stat = await fs.stat(filepath);
  return {
    filename,
    size: stat.size,
    durationMs: Date.now() - start,
  };
}

export async function restoreBackup(filename: string): Promise<void> {
  const filepath = path.join(BACKUP_DIR, filename);
  await fs.access(filepath);

  const conn = parseConnectionString(config.databaseUrl);
  const psqlBin = findPgBin("psql");

  const gunzip = createGunzip();
  const input = createReadStream(filepath);

  const psql = spawn(psqlBin, [
    "-h", conn.host,
    "-p", conn.port,
    "-U", conn.user,
    "-d", conn.database,
    "--single-transaction",
  ], {
    env: { ...process.env, PGPASSWORD: conn.password },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderr = "";
  psql.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

  const exitCode = await new Promise<number>((resolve, reject) => {
    pipeline(input, gunzip, psql.stdin).catch((err) => {
      if ((err as NodeJS.ErrnoException).code !== "EPIPE") reject(err);
    });
    psql.on("close", (code) => resolve(code ?? 1));
    psql.on("error", reject);
  });

  if (exitCode !== 0) {
    throw new Error(`psql restore failed (exit ${exitCode}): ${stderr}`);
  }
}

export async function listBackups(): Promise<BackupMeta[]> {
  await ensureBackupDir();
  const entries = await fs.readdir(BACKUP_DIR);
  const backups: BackupMeta[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".sql.gz")) continue;
    const stat = await fs.stat(path.join(BACKUP_DIR, entry));
    backups.push({
      filename: entry,
      size: stat.size,
      createdAt: stat.mtime,
    });
  }

  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteBackup(filename: string): Promise<void> {
  const filepath = path.join(BACKUP_DIR, filename);
  await fs.unlink(filepath);
}

export async function cleanupOldBackups(): Promise<string[]> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const backups = await listBackups();
  const deleted: string[] = [];

  for (const backup of backups) {
    if (backup.createdAt.getTime() < cutoff) {
      await deleteBackup(backup.filename);
      deleted.push(backup.filename);
    }
  }

  return deleted;
}

export function getBackupConfig() {
  return {
    backupDir: BACKUP_DIR,
    retentionDays: RETENTION_DAYS,
    schedule: process.env.BACKUP_CRON ?? "0 3 * * *",
    enabled: process.env.BACKUP_ENABLED !== "false",
  };
}

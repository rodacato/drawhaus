import { Pool, type PoolClient } from "pg";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runner } = require("node-pg-migrate") as { runner: (options: { databaseUrl: string; dir: string; migrationsTable: string; direction: "up" | "down"; log: (msg: string) => void }) => Promise<unknown> };
import { config } from "./config";
import { logger } from "./logger";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  if (config.nodeEnv === "production") {
    try {
      const { createBackup } = await import("./services/backup-service");
      await createBackup();
      logger.info("Pre-migration backup created");
    } catch (err) {
      logger.warn(err, "Pre-migration backup failed, continuing...");
    }
  }

  await runner({
    databaseUrl: config.databaseUrl,
    dir: path.resolve(__dirname, "../migrations"),
    migrationsTable: "schema_migrations",
    direction: "up",
    log: (msg: string) => logger.info(msg),
  });
}

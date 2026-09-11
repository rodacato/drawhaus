import { after, beforeEach } from "node:test";
import { Client, escapeIdentifier } from "pg";
import { config } from "../../infrastructure/config";
import { pool, runMigrations } from "../../infrastructure/db";

const MIGRATIONS_TABLE = "schema_migrations";

/** Resolves the name the way pg will connect to it, so a URL trick cannot slip past the check. */
export function assertTestDatabase(databaseUrl: string): string {
  const { database } = new Client({ connectionString: databaseUrl });
  if (!database?.endsWith("_test")) {
    throw new Error(
      `Refusing to run Postgres tests against database "${database ?? ""}": its name must end with _test`,
    );
  }
  return database;
}

async function withClient<T>(databaseUrl: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function createDatabaseIfMissing(databaseUrl: string, database: string): Promise<void> {
  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = "/postgres";
  await withClient(maintenanceUrl.toString(), async (client) => {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      database,
    ]);
    if (rowCount === 0) await client.query(`CREATE DATABASE ${escapeIdentifier(database)}`);
  });
}

/** Rebuilds the schema from nothing and applies every migration. */
export async function prepareTestDatabase(databaseUrl: string): Promise<void> {
  const database = assertTestDatabase(databaseUrl);
  await createDatabaseIfMissing(databaseUrl, database);
  await withClient(databaseUrl, (client) =>
    client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public"),
  );
  await runMigrations(databaseUrl);
}

export async function truncateAllTables(): Promise<void> {
  assertTestDatabase(config.databaseUrl);
  const { rows } = await pool.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> $1",
    [MIGRATIONS_TABLE],
  );
  const tables = rows.map((r) => escapeIdentifier(r.tablename)).join(", ");
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  // The baseline migration seeds this singleton; restoring it keeps each test on a freshly migrated database.
  await pool.query("INSERT INTO site_settings (id) VALUES (true)");
}

/** Call at the top of every Postgres test file. */
export function useTestDatabase(): void {
  assertTestDatabase(config.databaseUrl);
  beforeEach(truncateAllTables);
  after(() => pool.end());
}

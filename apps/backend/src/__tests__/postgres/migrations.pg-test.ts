import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { config } from "../../infrastructure/config";
import { pool, runMigrations } from "../../infrastructure/db";
import { prepareTestDatabase, useTestDatabase } from "./test-database";

useTestDatabase();

const migrationFiles = readdirSync(path.resolve(__dirname, "../../migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b))
  .map((file) => file.replace(/\.sql$/, ""));

async function appliedMigrations(): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    "SELECT name FROM schema_migrations ORDER BY id",
  );
  return rows.map((r) => r.name);
}

describe("migrations", () => {
  it("apply every file, in order, to an empty database", async () => {
    await prepareTestDatabase(config.databaseUrl);

    assert.ok(migrationFiles.length > 0);
    assert.deepEqual(await appliedMigrations(), migrationFiles);
  });

  it("apply nothing when run again", async () => {
    await runMigrations(config.databaseUrl);

    assert.deepEqual(await appliedMigrations(), migrationFiles);
  });
});

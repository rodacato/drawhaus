/**
 * Database reset script — similar to Rails db:reset
 *
 * Drops all tables, recreates schema, then runs seed.
 *
 * Usage:
 *   npm run db:reset --workspace=backend
 *
 * ⚠️  WARNING: This destroys all data. Only use in development.
 */

import { pool, initSchema } from "../infrastructure/db";

async function reset() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") {
    console.error("❌ Cannot reset database in production!");
    process.exit(1);
  }

  console.log("🗑️  Resetting database...\n");

  // Drop all tables (cascade handles foreign keys)
  const tablesResult = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const tables = tablesResult.rows.map((r) => r.tablename);
  if (tables.length > 0) {
    console.log(`  Dropping ${tables.length} tables: ${tables.join(", ")}`);
    await pool.query(
      `DROP TABLE IF EXISTS ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`,
    );
    console.log("  ✓ All tables dropped");
  } else {
    console.log("  No tables to drop");
  }

  // Recreate schema
  await initSchema();
  console.log("  ✓ Schema recreated\n");

  // Run seed
  console.log("  Running seed...\n");

  // Import and run seed inline (to avoid spawning a subprocess)
  await import("./db-seed");
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});

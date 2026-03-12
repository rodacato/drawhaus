/**
 * Database seed script — similar to Rails db:seed
 *
 * Creates test/development data:
 * - Admin user
 * - Regular test user
 * - Sample workspace with diagrams and folders
 *
 * Usage:
 *   npm run db:seed --workspace=backend
 *
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING).
 */

import { pool, initSchema } from "../infrastructure/db";
import { hashSync } from "bcryptjs";

const SEED_ADMIN = {
  email: "admin@drawhaus.test",
  name: "Admin User",
  password: "admin1234",
  role: "admin",
};

const SEED_USER = {
  email: "e2e@drawhaus.test",
  name: "E2E Test User",
  password: "Test1234!pass",
  role: "user",
};

const SEED_USERS = [SEED_ADMIN, SEED_USER];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Ensure schema exists
  await initSchema();
  console.log("  ✓ Schema initialized");

  // Create users
  for (const u of SEED_USERS) {
    const hash = hashSync(u.password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role
       RETURNING id`,
      [u.email, u.name, hash, u.role],
    );
    const id = result.rows[0].id;
    console.log(`  ✓ User: ${u.email} (${u.role}) — id: ${id}`);

    // Ensure user has a personal workspace
    const wsResult = await pool.query(
      `INSERT INTO workspaces (owner_id, name, is_personal)
       VALUES ($1, $2, true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [id, "Personal"],
    );

    let workspaceId: string;
    if (wsResult.rows.length > 0) {
      workspaceId = wsResult.rows[0].id;
    } else {
      const existing = await pool.query(
        `SELECT id FROM workspaces WHERE owner_id = $1 AND is_personal = true LIMIT 1`,
        [id],
      );
      workspaceId = existing.rows[0]?.id;
    }

    if (workspaceId) {
      // Ensure user is a member of their workspace
      await pool.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT DO NOTHING`,
        [workspaceId, id],
      );

      // Create sample diagrams for the user
      if (u === SEED_ADMIN) {
        const sampleDiagrams = [
          "Architecture Overview",
          "Sprint Planning Board",
          "User Flow Diagram",
        ];

        for (const title of sampleDiagrams) {
          await pool.query(
            `INSERT INTO diagrams (owner_id, workspace_id, title)
             SELECT $1, $2, $3
             WHERE NOT EXISTS (
               SELECT 1 FROM diagrams WHERE owner_id = $1 AND title = $3
             )`,
            [id, workspaceId, title],
          );
        }
        console.log(`  ✓ Sample diagrams created for ${u.email}`);
      }
    }
  }

  // Ensure registration is open for development
  await pool.query(
    `UPDATE site_settings SET registration_open = true WHERE id = 1`,
  ).catch(() => {
    // site_settings may not have data yet
  });

  console.log("\n🌱 Seed complete!\n");
  console.log("  Accounts:");
  for (const u of SEED_USERS) {
    console.log(`    ${u.role.padEnd(6)} ${u.email} / ${u.password}`);
  }
  console.log();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

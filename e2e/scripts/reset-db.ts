import { Client } from "pg";
import { e2eDatabaseUrl } from "../support/e2e-env";

async function resetDatabase() {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }
}

resetDatabase().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../infrastructure/db";
import { PgSessionRepository } from "../../infrastructure/persistence/pg-session-repository";
import { countRows, createUser } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const sessions = new PgSessionRepository();

async function expire(token: string): Promise<void> {
  await pool.query("UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE id = $1", [
    token,
  ]);
}

describe("PgSessionRepository.findUserByToken", () => {
  it("returns the user of a live session and keeps the row", async () => {
    const userId = await createUser("Ada");
    const { token } = await sessions.create(userId);

    const user = await sessions.findUserByToken(token);

    assert.equal(user?.id, userId);
    assert.equal(user?.name, "Ada");
    assert.equal(await countRows("sessions", "id = $1", [token]), 1);
  });

  it("returns null for an expired session and deletes its row", async () => {
    const { token } = await sessions.create(await createUser());
    await expire(token);

    assert.equal(await sessions.findUserByToken(token), null);
    assert.equal(await countRows("sessions", "id = $1", [token]), 0);
  });

  it("leaves the user's other sessions alone when one expires", async () => {
    const userId = await createUser();
    const expired = await sessions.create(userId);
    const live = await sessions.create(userId);
    await expire(expired.token);

    await sessions.findUserByToken(expired.token);

    assert.equal((await sessions.findUserByToken(live.token))?.id, userId);
  });
});

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

describe("PgSessionRepository.deleteOthersForUser", () => {
  it("ends every other session of the user, returns their tokens and keeps the given one", async () => {
    const userId = await createUser();
    const keep = await sessions.create(userId);
    const other1 = await sessions.create(userId);
    const other2 = await sessions.create(userId);

    const ended = await sessions.deleteOthersForUser(userId, keep.token);

    assert.equal(ended.length, 2);
    assert.ok(ended.includes(other1.token) && ended.includes(other2.token));
    assert.equal((await sessions.findUserByToken(keep.token))?.id, userId);
    assert.equal(await sessions.findUserByToken(other1.token), null);
  });

  it("never touches another user's sessions", async () => {
    const userId = await createUser();
    const bystander = await sessions.create(await createUser());
    const keep = await sessions.create(userId);

    await sessions.deleteOthersForUser(userId, keep.token);

    assert.equal(await countRows("sessions", "id = $1", [bystander.token]), 1);
  });
});

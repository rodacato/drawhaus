import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LogoutUseCase } from "../../../application/use-cases/auth/logout";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const useCase = new LogoutUseCase(sessions);
  return { users, sessions, useCase };
}

describe("LogoutUseCase", () => {
  it("deletes the session for the given token", async () => {
    const { users, sessions, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "h" });
    const session = await sessions.create(user.id);
    assert.equal(sessions.sessions.length, 1);

    await useCase.execute(session.token);

    assert.equal(sessions.sessions.length, 0);
  });

  it("is a no-op when token is null (does not throw)", async () => {
    const { sessions, useCase } = setup();

    await useCase.execute(null);

    assert.equal(sessions.sessions.length, 0);
  });

  it("is idempotent: deleting a non-existent session does not throw", async () => {
    const { useCase } = setup();

    await useCase.execute("never-existed");
  });
});

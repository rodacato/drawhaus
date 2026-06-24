import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GetCurrentUserUseCase } from "../../../application/use-cases/auth/get-current-user";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { UnauthorizedError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const useCase = new GetCurrentUserUseCase(sessions);
  return { users, sessions, useCase };
}

describe("GetCurrentUserUseCase", () => {
  it("returns the auth user when the session token resolves to a user", async () => {
    const { users, sessions, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_pw" });
    const session = await sessions.create(user.id);

    const result = await useCase.execute(session.token);

    assert.equal(result.id, user.id);
    assert.equal(result.email, "u@example.com");
    assert.equal(result.hasPassword, true);
  });

  it("throws UnauthorizedError when the session token is null", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute(null),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when the session token doesn't resolve to a user", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("does-not-exist"),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });
});

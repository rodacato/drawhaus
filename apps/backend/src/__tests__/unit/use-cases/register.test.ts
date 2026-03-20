import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RegisterUseCase } from "../../../application/use-cases/auth/register";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { ConflictError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const hasher = new FakeHasher();
  const useCase = new RegisterUseCase(users, sessions, hasher);
  return { users, sessions, hasher, useCase };
}

describe("RegisterUseCase", () => {
  it("creates user and session", async () => {
    const { users, sessions, useCase } = setup();

    const result = await useCase.execute({
      email: "Test@Example.com",
      name: "Test",
      password: "password123",
    });

    assert.equal(result.user.email, "test@example.com");
    assert.equal(result.user.name, "Test");
    assert.ok(result.sessionToken);
    assert.equal(users.store.length, 1);
    assert.equal(sessions.sessions.length, 1);
  });

  it("rejects duplicate email", async () => {
    const { useCase } = setup();

    await useCase.execute({ email: "a@b.com", name: "A", password: "password123" });

    await assert.rejects(
      () => useCase.execute({ email: "a@b.com", name: "B", password: "password456" }),
      (err: unknown) => err instanceof ConflictError,
    );
  });

  it("lowercases email", async () => {
    const { users, useCase } = setup();
    await useCase.execute({ email: "UPPER@CASE.COM", name: "U", password: "password123" });
    assert.equal(users.store[0].email, "upper@case.com");
  });
});

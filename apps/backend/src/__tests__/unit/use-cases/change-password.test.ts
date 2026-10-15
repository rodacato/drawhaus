import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ChangePasswordUseCase } from "../../../application/use-cases/auth/change-password";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { FakeRealtimeNotifier } from "../../fakes/fake-realtime-notifier";
import { FakeHasher } from "../../fakes/fake-hasher";
import { NotFoundError, UnauthorizedError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakeHasher();
  const sessions = new InMemorySessionRepository(() => users.store);
  const notifier = new FakeRealtimeNotifier();
  const useCase = new ChangePasswordUseCase(users, hasher, sessions, notifier);
  return { users, hasher, sessions, notifier, useCase };
}

describe("ChangePasswordUseCase", () => {
  it("verifies current password and stores the new hashed password", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_oldpw",
    });

    await useCase.execute(user.id, { currentPassword: "oldpw", newPassword: "newpw1234" });

    assert.equal(users.store[0].passwordHash, "hashed_newpw1234");
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("missing-id", { currentPassword: "x", newPassword: "newpw1234" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws UnauthorizedError on wrong current password", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_oldpw",
    });

    await assert.rejects(
      () => useCase.execute(user.id, { currentPassword: "wrong", newPassword: "newpw1234" }),
      (err: unknown) => err instanceof UnauthorizedError,
    );
    assert.equal(users.store[0].passwordHash, "hashed_oldpw");
  });

  it("throws UnauthorizedError when user has password but currentPassword is missing", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_oldpw",
    });

    await assert.rejects(
      () => useCase.execute(user.id, { newPassword: "newpw1234" }),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("allows OAuth-only user (no password) to set one without currentPassword", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: null,
      googleId: "g-1",
    });

    await useCase.execute(user.id, { newPassword: "firstpw1234" });

    assert.equal(users.store[0].passwordHash, "hashed_firstpw1234");
  });

  it("ends the user's other sessions, keeps the current one and tells the other boards", async () => {
    const { users, sessions, notifier, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_oldpw",
    });
    const current = await sessions.create(user.id);
    const other = await sessions.create(user.id);
    const bystander = await users.create({ email: "b@example.com", name: "B", passwordHash: "x" });
    const bystanderSession = await sessions.create(bystander.id);

    await useCase.execute(
      user.id,
      { currentPassword: "oldpw", newPassword: "newpw1234" },
      current.token,
    );

    assert.deepEqual(
      sessions.sessions.map((s) => s.token),
      [current.token, bystanderSession.token],
    );
    assert.deepEqual(notifier.accessesRevoked, [{ kind: "session", sessionToken: other.token }]);
  });

  it("leaves every session alone when the current password is wrong", async () => {
    const { users, sessions, notifier, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_oldpw",
    });
    const current = await sessions.create(user.id);
    await sessions.create(user.id);

    await assert.rejects(
      () =>
        useCase.execute(
          user.id,
          { currentPassword: "wrong", newPassword: "newpw1234" },
          current.token,
        ),
      (err: unknown) => err instanceof UnauthorizedError,
    );

    assert.equal(sessions.sessions.length, 2);
    assert.deepEqual(notifier.accessesRevoked, []);
  });
});

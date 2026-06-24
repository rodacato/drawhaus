import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ChangePasswordUseCase } from "../../../application/use-cases/auth/change-password";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { NotFoundError, UnauthorizedError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakeHasher();
  const useCase = new ChangePasswordUseCase(users, hasher);
  return { users, hasher, useCase };
}

describe("ChangePasswordUseCase", () => {
  it("verifies current password and stores the new hashed password", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_oldpw" });

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
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_oldpw" });

    await assert.rejects(
      () => useCase.execute(user.id, { currentPassword: "wrong", newPassword: "newpw1234" }),
      (err: unknown) => err instanceof UnauthorizedError,
    );
    assert.equal(users.store[0].passwordHash, "hashed_oldpw");
  });

  it("throws UnauthorizedError when user has password but currentPassword is missing", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_oldpw" });

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
});

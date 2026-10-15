import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UpdateProfileUseCase } from "../../../application/use-cases/auth/update-profile";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { ConflictError, NotFoundError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const useCase = new UpdateProfileUseCase(users);
  return { users, useCase };
}

describe("UpdateProfileUseCase", () => {
  it("updates name and email and returns the projection", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "old@example.com", name: "Old", passwordHash: "h" });

    const result = await useCase.execute(user.id, { name: "New", email: "new@example.com" });

    assert.equal(users.store[0].name, "New");
    assert.equal(users.store[0].email, "new@example.com");
    assert.deepEqual(result, { id: user.id, email: "new@example.com", name: "New" });
  });

  it("updates only the name when email is omitted", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "Old", passwordHash: "h" });

    await useCase.execute(user.id, { name: "Renamed" });

    assert.equal(users.store[0].name, "Renamed");
    assert.equal(users.store[0].email, "u@example.com");
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("missing-id", { name: "X" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws ConflictError when the requested email is already in use by another user", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "a@example.com", name: "A", passwordHash: "h" });
    await users.create({ email: "taken@example.com", name: "B", passwordHash: "h" });

    await assert.rejects(
      () => useCase.execute(user.id, { email: "taken@example.com" }),
      (err: unknown) => err instanceof ConflictError,
    );
    assert.equal(users.store[0].email, "a@example.com");
  });

  it("allows keeping the same email (no-op email change does not trigger conflict)", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "same@example.com", name: "A", passwordHash: "h" });

    const result = await useCase.execute(user.id, { name: "B", email: "same@example.com" });

    assert.equal(result.email, "same@example.com");
    assert.equal(users.store[0].name, "B");
  });

  it("stores the email lowercased, as login and register expect it", async () => {
    const { users, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "h" });

    const result = await useCase.execute(user.id, { email: "New.Address@Example.COM" });

    assert.equal(users.store[0].email, "new.address@example.com");
    assert.equal(result.email, "new.address@example.com");
  });

  it("treats an address that differs only by case as already in use", async () => {
    const { users, useCase } = setup();
    await users.create({ email: "taken@example.com", name: "T", passwordHash: "h" });
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "h" });

    await assert.rejects(
      () => useCase.execute(user.id, { email: "Taken@Example.com" }),
      (err: unknown) => err instanceof ConflictError,
    );
    assert.equal(users.store[1].email, "u@example.com");
  });
});

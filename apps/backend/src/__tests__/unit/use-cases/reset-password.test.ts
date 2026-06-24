import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ResetPasswordUseCase } from "../../../application/use-cases/auth/reset-password";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryPasswordResetRepository } from "../../fakes/in-memory-password-reset-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { ConflictError, ExpiredError, NotFoundError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const resetTokens = new InMemoryPasswordResetRepository();
  const hasher = new FakeHasher();
  const useCase = new ResetPasswordUseCase(users, sessions, resetTokens, hasher);
  return { users, sessions, resetTokens, hasher, useCase };
}

describe("ResetPasswordUseCase", () => {
  describe("validate", () => {
    it("returns {valid: true} for an unused, unexpired token", async () => {
      const { resetTokens, useCase } = setup();
      await resetTokens.create({
        userId: "u1",
        token: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      });

      assert.deepEqual(await useCase.validate("tok"), { valid: true });
    });

    it("returns {valid: false} for an unknown token", async () => {
      const { useCase } = setup();
      assert.deepEqual(await useCase.validate("nope"), { valid: false });
    });

    it("returns {valid: false} for a used token", async () => {
      const { resetTokens, useCase } = setup();
      const reset = await resetTokens.create({
        userId: "u1",
        token: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      });
      await resetTokens.markUsed(reset.id);

      assert.deepEqual(await useCase.validate("tok"), { valid: false });
    });

    it("returns {valid: false} for an expired token", async () => {
      const { resetTokens, useCase } = setup();
      await resetTokens.create({
        userId: "u1",
        token: "tok",
        expiresAt: new Date(Date.now() - 1000),
      });

      assert.deepEqual(await useCase.validate("tok"), { valid: false });
    });
  });

  describe("execute", () => {
    it("hashes the new password, updates the user, marks reset used, and invalidates all sessions", async () => {
      const { users, sessions, resetTokens, useCase } = setup();
      const user = await users.create({
        email: "u@example.com",
        name: "U",
        passwordHash: "hashed_old",
      });
      const reset = await resetTokens.create({
        userId: user.id,
        token: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      });
      await sessions.create(user.id);
      await sessions.create(user.id);
      assert.equal(sessions.sessions.length, 2);

      await useCase.execute({ token: "tok", newPassword: "newpass1234" });

      assert.equal(users.store[0].passwordHash, "hashed_newpass1234");
      assert.ok(resetTokens.store.find((r) => r.id === reset.id)?.usedAt);
      assert.equal(sessions.sessions.length, 0);
    });

    it("throws NotFoundError for an unknown token", async () => {
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.execute({ token: "nope", newPassword: "newpass1234" }),
        (err: unknown) => err instanceof NotFoundError,
      );
    });

    it("throws ConflictError if usedAt is set", async () => {
      const { resetTokens, useCase } = setup();
      const reset = await resetTokens.create({
        userId: "u1",
        token: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      });
      await resetTokens.markUsed(reset.id);

      await assert.rejects(
        () => useCase.execute({ token: "tok", newPassword: "newpass1234" }),
        (err: unknown) => err instanceof ConflictError,
      );
    });

    it("throws ExpiredError if past expiresAt", async () => {
      const { resetTokens, useCase } = setup();
      await resetTokens.create({
        userId: "u1",
        token: "tok",
        expiresAt: new Date(Date.now() - 1000),
      });

      await assert.rejects(
        () => useCase.execute({ token: "tok", newPassword: "newpass1234" }),
        (err: unknown) => err instanceof ExpiredError,
      );
    });
  });
});

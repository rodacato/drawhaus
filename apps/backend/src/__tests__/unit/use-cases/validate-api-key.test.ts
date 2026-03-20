import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ValidateApiKeyUseCase } from "../../../application/use-cases/api-keys/validate-api-key";
import { InMemoryApiKeyRepository } from "../../fakes/in-memory-api-key-repository";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { UnauthorizedError } from "../../../domain/errors";

describe("ValidateApiKeyUseCase", () => {
  async function setup() {
    const apiKeys = new InMemoryApiKeyRepository();
    const users = new InMemoryUserRepository();
    const user = await users.create({ email: "test@test.com", name: "Test", passwordHash: "hash" });
    const useCase = new ValidateApiKeyUseCase(apiKeys, users);

    // Create a key manually
    const plainKey = "dhk_" + crypto.randomBytes(32).toString("base64url");
    const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");
    const apiKey = await apiKeys.create({
      userId: user.id,
      workspaceId: "ws-1",
      name: "Test Key",
      keyPrefix: plainKey.slice(0, 10),
      keyHash,
      expiresAt: null,
    });

    return { apiKeys, users, user, useCase, plainKey, apiKey };
  }

  it("validates a valid API key", async () => {
    const { useCase, plainKey, user } = await setup();
    const result = await useCase.execute(plainKey);

    assert.equal(result.user.id, user.id);
    assert.equal(result.user.email, user.email);
    assert.equal(result.workspaceId, "ws-1");
  });

  it("rejects invalid key", async () => {
    const { useCase } = await setup();
    await assert.rejects(
      () => useCase.execute("dhk_invalid_key_that_does_not_exist"),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("rejects revoked key", async () => {
    const { useCase, plainKey, apiKey, apiKeys } = await setup();
    await apiKeys.revoke(apiKey.id);

    await assert.rejects(
      () => useCase.execute(plainKey),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("rejects expired key", async () => {
    const { useCase, users, apiKeys } = await setup();
    const user = users.store[0];

    // Create an expired key
    const plainKey2 = "dhk_" + crypto.randomBytes(32).toString("base64url");
    const keyHash2 = crypto.createHash("sha256").update(plainKey2).digest("hex");
    await apiKeys.create({
      userId: user.id,
      workspaceId: "ws-1",
      name: "Expired Key",
      keyPrefix: plainKey2.slice(0, 10),
      keyHash: keyHash2,
      expiresAt: new Date(Date.now() - 86400_000), // expired yesterday
    });

    await assert.rejects(
      () => useCase.execute(plainKey2),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("rejects key of disabled user", async () => {
    const { useCase, plainKey, users } = await setup();
    users.store[0].disabled = true;

    await assert.rejects(
      () => useCase.execute(plainKey),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });
});

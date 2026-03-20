import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RevokeApiKeyUseCase } from "../../../application/use-cases/api-keys/revoke-api-key";
import { InMemoryApiKeyRepository } from "../../fakes/in-memory-api-key-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

describe("RevokeApiKeyUseCase", () => {
  it("revokes own API key", async () => {
    const apiKeys = new InMemoryApiKeyRepository();
    const useCase = new RevokeApiKeyUseCase(apiKeys);

    const key = await apiKeys.create({
      userId: "user-1",
      workspaceId: "ws-1",
      name: "Key",
      keyPrefix: "dhk_abc123",
      keyHash: "hash123",
      expiresAt: null,
    });

    await useCase.execute(key.id, "user-1");
    const revoked = await apiKeys.findById(key.id);
    assert.ok(revoked?.revokedAt);
  });

  it("rejects revoking another user's key", async () => {
    const apiKeys = new InMemoryApiKeyRepository();
    const useCase = new RevokeApiKeyUseCase(apiKeys);

    const key = await apiKeys.create({
      userId: "user-1",
      workspaceId: "ws-1",
      name: "Key",
      keyPrefix: "dhk_abc123",
      keyHash: "hash123",
      expiresAt: null,
    });

    await assert.rejects(
      () => useCase.execute(key.id, "user-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("rejects non-existent key", async () => {
    const apiKeys = new InMemoryApiKeyRepository();
    const useCase = new RevokeApiKeyUseCase(apiKeys);

    await assert.rejects(
      () => useCase.execute("non-existent", "user-1"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});

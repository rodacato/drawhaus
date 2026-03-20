import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateApiKeyUseCase } from "../../../application/use-cases/api-keys/create-api-key";
import { InMemoryApiKeyRepository } from "../../fakes/in-memory-api-key-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { ForbiddenError, ConflictError } from "../../../domain/errors";

describe("CreateApiKeyUseCase", () => {
  async function setup() {
    const apiKeys = new InMemoryApiKeyRepository();
    const workspaces = new InMemoryWorkspaceRepository();
    const workspace = await workspaces.create({ name: "Test", ownerId: "user-1" });
    const useCase = new CreateApiKeyUseCase(apiKeys, workspaces);
    return { apiKeys, workspaces, workspace, useCase };
  }

  it("creates an API key with dhk_ prefix", async () => {
    const { useCase, workspace } = await setup();
    const { apiKey, plainKey } = await useCase.execute({
      userId: "user-1",
      workspaceId: workspace.id,
      name: "Test Key",
    });

    assert.ok(plainKey.startsWith("dhk_"));
    assert.equal(apiKey.name, "Test Key");
    assert.equal(apiKey.workspaceId, workspace.id);
    assert.equal(apiKey.userId, "user-1");
    assert.ok(apiKey.keyPrefix.startsWith("dhk_"));
    assert.equal(apiKey.expiresAt, null);
    assert.equal(apiKey.revokedAt, null);
  });

  it("rejects non-member", async () => {
    const { useCase, workspace } = await setup();
    await assert.rejects(
      () => useCase.execute({ userId: "stranger", workspaceId: workspace.id, name: "Key" }),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("rejects when max active keys reached", async () => {
    const { useCase, workspace } = await setup();
    for (let i = 0; i < 10; i++) {
      await useCase.execute({ userId: "user-1", workspaceId: workspace.id, name: `Key ${i}` });
    }
    await assert.rejects(
      () => useCase.execute({ userId: "user-1", workspaceId: workspace.id, name: "One too many" }),
      (err: unknown) => err instanceof ConflictError,
    );
  });

  it("sets expiration when provided", async () => {
    const { useCase, workspace } = await setup();
    const future = new Date(Date.now() + 86400_000);
    const { apiKey } = await useCase.execute({
      userId: "user-1",
      workspaceId: workspace.id,
      name: "Expiring",
      expiresAt: future,
    });

    assert.ok(apiKey.expiresAt);
    assert.equal(apiKey.expiresAt.getTime(), future.getTime());
  });

  it("trims name whitespace", async () => {
    const { useCase, workspace } = await setup();
    const { apiKey } = await useCase.execute({
      userId: "user-1",
      workspaceId: workspace.id,
      name: "  Trimmed  ",
    });
    assert.equal(apiKey.name, "Trimmed");
  });
});

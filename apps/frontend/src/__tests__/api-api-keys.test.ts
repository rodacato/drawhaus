import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { apiKeysApi } from "../api/api-keys";

describe("apiKeysApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list calls /api/api-keys", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ keys: [] });
    const result = await apiKeysApi.list();
    assert.deepEqual(stub.mock.calls[0], ["/api/api-keys"]);
    assert.deepEqual(result, { keys: [] });
  });

  test("create posts name+workspaceId+expiresAt", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ key: { id: "k1" }, plainKey: "abc" });
    await apiKeysApi.create({ name: "ci", workspaceId: "w1", expiresAt: "2027-01-01" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/api-keys",
      { name: "ci", workspaceId: "w1", expiresAt: "2027-01-01" },
    ]);
  });

  test("revoke deletes by id", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await apiKeysApi.revoke("k1");
    assert.deepEqual(stub.mock.calls[0], ["/api/api-keys/k1"]);
  });
});

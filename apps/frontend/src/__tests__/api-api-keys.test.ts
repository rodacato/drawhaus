import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { apiKeysApi } from "../api/api-keys";

describe("apiKeysApi", () => {
  beforeEach(() => mock.restoreAll());

  test("list calls /api/api-keys", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ keys: [] }));
    const result = await apiKeysApi.list();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/api-keys"]);
    assert.deepEqual(result, { keys: [] });
  });

  test("create posts name+workspaceId+expiresAt", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ key: { id: "k1" }, plainKey: "abc" }));
    await apiKeysApi.create({ name: "ci", workspaceId: "w1", expiresAt: "2027-01-01" });
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/api-keys",
      { name: "ci", workspaceId: "w1", expiresAt: "2027-01-01" },
    ]);
  });

  test("revoke deletes by id", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await apiKeysApi.revoke("k1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/api-keys/k1"]);
  });
});

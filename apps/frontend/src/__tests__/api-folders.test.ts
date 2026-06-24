import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { foldersApi } from "../api/folders";

describe("foldersApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list omits workspaceId param when not provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await foldersApi.list();
    assert.deepEqual(stub.mock.calls[0], ["/api/folders", { params: undefined }]);
  });

  test("list includes workspaceId param when provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await foldersApi.list("w1");
    assert.deepEqual(stub.mock.calls[0], ["/api/folders", { params: { workspaceId: "w1" } }]);
  });

  test("create posts name+workspaceId", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await foldersApi.create("docs", "w1");
    assert.deepEqual(stub.mock.calls[0], ["/api/folders", { name: "docs", workspaceId: "w1" }]);
  });

  test("create posts name with undefined workspaceId when omitted", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await foldersApi.create("docs");
    assert.deepEqual(stub.mock.calls[0], ["/api/folders", { name: "docs", workspaceId: undefined }]);
  });

  test("delete removes by id", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await foldersApi.delete("f1");
    assert.deepEqual(stub.mock.calls[0], ["/api/folders/f1"]);
  });
});

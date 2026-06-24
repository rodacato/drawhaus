import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { foldersApi } from "../api/folders";

describe("foldersApi", () => {
  beforeEach(() => mock.restoreAll());

  test("list omits workspaceId param when not provided", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await foldersApi.list();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/folders", { params: undefined }]);
  });

  test("list includes workspaceId param when provided", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await foldersApi.list("w1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/folders", { params: { workspaceId: "w1" } }]);
  });

  test("create posts name+workspaceId", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await foldersApi.create("docs", "w1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/folders", { name: "docs", workspaceId: "w1" }]);
  });

  test("create posts name with undefined workspaceId when omitted", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await foldersApi.create("docs");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/folders", { name: "docs", workspaceId: undefined }]);
  });

  test("delete removes by id", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await foldersApi.delete("f1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/folders/f1"]);
  });
});

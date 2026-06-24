import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { templatesApi } from "../api/templates";

describe("templatesApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list omits workspaceId param when not provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ templates: [] });
    await templatesApi.list();
    assert.deepEqual(stub.mock.calls[0], ["/api/templates", { params: undefined }]);
  });

  test("list includes workspaceId param when provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ templates: [] });
    await templatesApi.list("w1");
    assert.deepEqual(stub.mock.calls[0], ["/api/templates", { params: { workspaceId: "w1" } }]);
  });

  test("get fetches template by id", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ template: {} });
    await templatesApi.get("t1");
    assert.deepEqual(stub.mock.calls[0], ["/api/templates/t1"]);
  });

  test("create posts full payload", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ template: {} });
    await templatesApi.create({
      title: "Flow",
      description: "desc",
      category: "flowchart",
      elements: [],
      appState: { viewBackgroundColor: "#fff" },
    });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/templates",
      {
        title: "Flow",
        description: "desc",
        category: "flowchart",
        elements: [],
        appState: { viewBackgroundColor: "#fff" },
      },
    ]);
  });

  test("use posts to /use with payload", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ diagram: { id: "d1", title: "X" } });
    await templatesApi.use("t1", { title: "X", workspaceId: "w1", folderId: null });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/templates/t1/use",
      { title: "X", workspaceId: "w1", folderId: null },
    ]);
  });

  test("update patches partial fields", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({ template: {} });
    await templatesApi.update("t1", { title: "new" });
    assert.deepEqual(stub.mock.calls[0], ["/api/templates/t1", { title: "new" }]);
  });

  test("delete removes template", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({ success: true });
    await templatesApi.delete("t1");
    assert.deepEqual(stub.mock.calls[0], ["/api/templates/t1"]);
  });
});

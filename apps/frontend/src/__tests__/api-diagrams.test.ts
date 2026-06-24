import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { diagramsApi } from "../api/diagrams";

describe("diagramsApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list passes no params when called without arg", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await diagramsApi.list();
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams", { params: undefined }]);
  });

  test("list passes folderId+workspaceId params", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await diagramsApi.list({ folderId: "f1", workspaceId: "w1" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams",
      { params: { folderId: "f1", workspaceId: "w1" } },
    ]);
  });

  test("search passes q param", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await diagramsApi.search("hello");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/search", { params: { q: "hello" } }]);
  });

  test("get fetches by id", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ id: "d1" });
    await diagramsApi.get("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1"]);
  });

  test("create posts data", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await diagramsApi.create({ title: "X", folderId: "f1" });
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams", { title: "X", folderId: "f1" }]);
  });

  test("update patches by id", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await diagramsApi.update("d1", { title: "New" });
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1", { title: "New" }]);
  });

  test("updateThumbnail puts thumbnail", async () => {
    const stub = vi.spyOn(api, "put").mockResolvedValue({});
    await diagramsApi.updateThumbnail("d1", "data:image/png;base64,xxx");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/thumbnail",
      { thumbnail: "data:image/png;base64,xxx" },
    ]);
  });

  test("move posts folderId only when no workspaceId", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await diagramsApi.move("d1", "f1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/move", { folderId: "f1" }]);
  });

  test("move includes workspaceId when provided", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await diagramsApi.move("d1", null, "w1");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/move",
      { folderId: null, workspaceId: "w1" },
    ]);
  });

  test("delete removes by id", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await diagramsApi.delete("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1"]);
  });

  test("duplicate posts to /duplicate", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await diagramsApi.duplicate("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/duplicate"]);
  });

  test("toggleStar patches starred flag", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await diagramsApi.toggleStar("d1", true);
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/star", { starred: true }]);
  });
});

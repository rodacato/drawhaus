import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { diagramsApi } from "../api/diagrams";

describe("diagramsApi", () => {
  beforeEach(() => mock.restoreAll());

  test("list passes no params when called without arg", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await diagramsApi.list();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams", { params: undefined }]);
  });

  test("list passes folderId+workspaceId params", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await diagramsApi.list({ folderId: "f1", workspaceId: "w1" });
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/diagrams",
      { params: { folderId: "f1", workspaceId: "w1" } },
    ]);
  });

  test("search passes q param", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await diagramsApi.search("hello");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/search", { params: { q: "hello" } }]);
  });

  test("get fetches by id", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ id: "d1" }));
    await diagramsApi.get("d1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1"]);
  });

  test("create posts data", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await diagramsApi.create({ title: "X", folderId: "f1" });
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams", { title: "X", folderId: "f1" }]);
  });

  test("update patches by id", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({}));
    await diagramsApi.update("d1", { title: "New" });
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1", { title: "New" }]);
  });

  test("updateThumbnail puts thumbnail", async () => {
    const stub = mock.method(api, "put", () => Promise.resolve({}));
    await diagramsApi.updateThumbnail("d1", "data:image/png;base64,xxx");
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/diagrams/d1/thumbnail",
      { thumbnail: "data:image/png;base64,xxx" },
    ]);
  });

  test("move posts folderId only when no workspaceId", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await diagramsApi.move("d1", "f1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/move", { folderId: "f1" }]);
  });

  test("move includes workspaceId when provided", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await diagramsApi.move("d1", null, "w1");
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/diagrams/d1/move",
      { folderId: null, workspaceId: "w1" },
    ]);
  });

  test("delete removes by id", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await diagramsApi.delete("d1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1"]);
  });

  test("duplicate posts to /duplicate", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await diagramsApi.duplicate("d1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/duplicate"]);
  });

  test("toggleStar patches starred flag", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({}));
    await diagramsApi.toggleStar("d1", true);
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/star", { starred: true }]);
  });
});

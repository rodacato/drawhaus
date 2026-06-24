import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { commentsApi } from "../api/comments";

describe("commentsApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list omits params when sceneId not provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await commentsApi.list("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/comments", { params: undefined }]);
  });

  test("list includes sceneId when provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await commentsApi.list("d1", "s1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/comments", { params: { sceneId: "s1" } }]);
  });

  test("list with null sceneId omits params", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await commentsApi.list("d1", null);
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/comments", { params: undefined }]);
  });

  test("create posts elementId+body+sceneId", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await commentsApi.create("d1", { elementId: "e1", body: "hi", sceneId: "s1" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/comments",
      { elementId: "e1", body: "hi", sceneId: "s1" },
    ]);
  });

  test("reply posts to thread", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await commentsApi.reply("d1", "t1", { body: "reply" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/comments/t1/replies",
      { body: "reply" },
    ]);
  });

  test("resolve patches resolved flag", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await commentsApi.resolve("d1", "t1", true);
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/comments/t1/resolve",
      { resolved: true },
    ]);
  });

  test("delete removes thread", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await commentsApi.delete("d1", "t1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/comments/t1"]);
  });

  test("toggleLike posts to /like and returns liked+count", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ liked: true, likeCount: 3 });
    const result = await commentsApi.toggleLike("d1", "t1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/comments/t1/like"]);
    assert.deepEqual(result, { liked: true, likeCount: 3 });
  });
});

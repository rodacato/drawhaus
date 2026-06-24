import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { tagsApi } from "../api/tags";

describe("tagsApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list calls /api/tags", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ tags: [] });
    await tagsApi.list();
    assert.deepEqual(stub.mock.calls[0], ["/api/tags"]);
  });

  test("create posts name+color", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ tag: {} });
    await tagsApi.create("urgent", "#ff0000");
    assert.deepEqual(stub.mock.calls[0], ["/api/tags", { name: "urgent", color: "#ff0000" }]);
  });

  test("create posts undefined color when omitted", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ tag: {} });
    await tagsApi.create("urgent");
    assert.deepEqual(stub.mock.calls[0], ["/api/tags", { name: "urgent", color: undefined }]);
  });

  test("update patches name+color", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({ tag: {} });
    await tagsApi.update("t1", { name: "new", color: "#00ff00" });
    assert.deepEqual(stub.mock.calls[0], ["/api/tags/t1", { name: "new", color: "#00ff00" }]);
  });

  test("delete removes by id", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await tagsApi.delete("t1");
    assert.deepEqual(stub.mock.calls[0], ["/api/tags/t1"]);
  });

  test("assign posts diagramId", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await tagsApi.assign("t1", "d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/tags/t1/assign", { diagramId: "d1" }]);
  });

  test("unassign posts diagramId", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await tagsApi.unassign("t1", "d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/tags/t1/unassign", { diagramId: "d1" }]);
  });
});

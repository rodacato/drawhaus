import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { shareApi } from "../api/share";

describe("shareApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("create posts role+expiresInHours", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await shareApi.create("d1", "viewer", 24);
    assert.deepEqual(stub.mock.calls[0], [
      "/api/share/d1",
      { role: "viewer", expiresInHours: 24 },
    ]);
  });

  test("create posts role with undefined expiresInHours when omitted", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await shareApi.create("d1", "editor");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/share/d1",
      { role: "editor", expiresInHours: undefined },
    ]);
  });

  test("list fetches links for diagram", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await shareApi.list("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/share/d1/links"]);
  });

  test("deleteLink removes by token", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await shareApi.deleteLink("tok123");
    assert.deepEqual(stub.mock.calls[0], ["/api/share/link/tok123"]);
  });

  test("resolve fetches link by token", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({});
    await shareApi.resolve("tok123");
    assert.deepEqual(stub.mock.calls[0], ["/api/share/link/tok123"]);
  });
});

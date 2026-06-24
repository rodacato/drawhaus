import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { shareApi } from "../api/share";

describe("shareApi", () => {
  beforeEach(() => mock.restoreAll());

  test("create posts role+expiresInHours", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await shareApi.create("d1", "viewer", 24);
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/share/d1",
      { role: "viewer", expiresInHours: 24 },
    ]);
  });

  test("create posts role with undefined expiresInHours when omitted", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await shareApi.create("d1", "editor");
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/share/d1",
      { role: "editor", expiresInHours: undefined },
    ]);
  });

  test("list fetches links for diagram", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await shareApi.list("d1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/share/d1/links"]);
  });

  test("deleteLink removes by token", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await shareApi.deleteLink("tok123");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/share/link/tok123"]);
  });

  test("resolve fetches link by token", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({}));
    await shareApi.resolve("tok123");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/share/link/tok123"]);
  });
});

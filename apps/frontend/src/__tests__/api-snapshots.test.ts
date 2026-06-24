import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { snapshotsApi } from "../api/snapshots";

describe("snapshotsApi", () => {
  beforeEach(() => mock.restoreAll());

  test("list fetches snapshots for diagram", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ snapshots: [] }));
    await snapshotsApi.list("d1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/snapshots"]);
  });

  test("get fetches single snapshot", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ snapshot: { id: "s1" } }));
    await snapshotsApi.get("d1", "s1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/snapshots/s1"]);
  });

  test("create posts name", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ snapshot: { id: "s1" } }));
    await snapshotsApi.create("d1", "named");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/snapshots", { name: "named" }]);
  });

  test("create posts undefined name when omitted", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ snapshot: { id: "s1" } }));
    await snapshotsApi.create("d1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/snapshots", { name: undefined }]);
  });

  test("restore posts to /restore endpoint", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ success: true, diagramId: "d1" }));
    await snapshotsApi.restore("d1", "s1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/snapshots/s1/restore"]);
  });

  test("rename patches name", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({ snapshot: { id: "s1" } }));
    await snapshotsApi.rename("d1", "s1", "new-name");
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/diagrams/d1/snapshots/s1",
      { name: "new-name" },
    ]);
  });

  test("rename accepts null to clear name", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({ snapshot: { id: "s1" } }));
    await snapshotsApi.rename("d1", "s1", null);
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/diagrams/d1/snapshots/s1",
      { name: null },
    ]);
  });

  test("delete removes snapshot", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await snapshotsApi.delete("d1", "s1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/diagrams/d1/snapshots/s1"]);
  });
});

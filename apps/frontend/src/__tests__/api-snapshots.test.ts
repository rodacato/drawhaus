import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { snapshotsApi } from "../api/snapshots";

describe("snapshotsApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list fetches snapshots for diagram", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ snapshots: [] });
    await snapshotsApi.list("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/snapshots"]);
  });

  test("get fetches single snapshot", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ snapshot: { id: "s1" } });
    await snapshotsApi.get("d1", "s1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/snapshots/s1"]);
  });

  test("create posts name", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ snapshot: { id: "s1" } });
    await snapshotsApi.create("d1", "named");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/snapshots", { name: "named" }]);
  });

  test("create posts undefined name when omitted", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ snapshot: { id: "s1" } });
    await snapshotsApi.create("d1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/snapshots", { name: undefined }]);
  });

  test("restore posts to /restore endpoint", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ success: true, diagramId: "d1" });
    await snapshotsApi.restore("d1", "s1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/snapshots/s1/restore"]);
  });

  test("rename patches name", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({ snapshot: { id: "s1" } });
    await snapshotsApi.rename("d1", "s1", "new-name");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/snapshots/s1",
      { name: "new-name" },
    ]);
  });

  test("rename accepts null to clear name", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({ snapshot: { id: "s1" } });
    await snapshotsApi.rename("d1", "s1", null);
    assert.deepEqual(stub.mock.calls[0], [
      "/api/diagrams/d1/snapshots/s1",
      { name: null },
    ]);
  });

  test("delete removes snapshot", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await snapshotsApi.delete("d1", "s1");
    assert.deepEqual(stub.mock.calls[0], ["/api/diagrams/d1/snapshots/s1"]);
  });
});

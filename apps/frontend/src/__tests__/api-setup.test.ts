import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { setupApi } from "../api/setup";

describe("setupApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("getStatus calls /api/setup/status", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ step: 1, setupCompleted: false });
    const result = await setupApi.getStatus();
    assert.deepEqual(stub.mock.calls[0], ["/api/setup/status"]);
    assert.deepEqual(result, { step: 1, setupCompleted: false });
  });

  test("submitStep2 posts settings", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await setupApi.submitStep2({ instanceName: "x", registrationOpen: true, backupEnabled: false });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/setup/step-2",
      { instanceName: "x", registrationOpen: true, backupEnabled: false },
    ]);
  });

  test("skipIntegrations posts with no body", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await setupApi.skipIntegrations();
    assert.deepEqual(stub.mock.calls[0], ["/api/setup/skip-integrations"]);
  });

  test("complete posts with no body", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await setupApi.complete();
    assert.deepEqual(stub.mock.calls[0], ["/api/setup/complete"]);
  });
});

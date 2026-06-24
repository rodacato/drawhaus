import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { setupApi } from "../api/setup";

describe("setupApi", () => {
  beforeEach(() => mock.restoreAll());

  test("getStatus calls /api/setup/status", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ step: 1, setupCompleted: false }));
    const result = await setupApi.getStatus();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/setup/status"]);
    assert.deepEqual(result, { step: 1, setupCompleted: false });
  });

  test("submitStep2 posts settings", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await setupApi.submitStep2({ instanceName: "x", registrationOpen: true, backupEnabled: false });
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/setup/step-2",
      { instanceName: "x", registrationOpen: true, backupEnabled: false },
    ]);
  });

  test("skipIntegrations posts with no body", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await setupApi.skipIntegrations();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/setup/skip-integrations"]);
  });

  test("complete posts with no body", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await setupApi.complete();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/setup/complete"]);
  });
});

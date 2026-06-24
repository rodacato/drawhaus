import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { adminApi, siteApi } from "../api/admin";

describe("siteApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("getStatus calls /api/site/status", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ maintenanceMode: false, instanceName: "drawhaus" });
    const result = await siteApi.getStatus();
    assert.deepEqual(stub.mock.calls[0], ["/api/site/status"]);
    assert.deepEqual(result, { maintenanceMode: false, instanceName: "drawhaus" });
  });
});

describe("adminApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("getMetrics calls /api/admin/metrics", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ users: 5 });
    await adminApi.getMetrics();
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/metrics"]);
  });

  test("listUsers calls /api/admin/users", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await adminApi.listUsers();
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/users"]);
  });

  test("updateUser patches role+disabled", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await adminApi.updateUser("u1", { role: "admin", disabled: false });
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/users/u1", { role: "admin", disabled: false }]);
  });

  test("deleteUser deletes user URL", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await adminApi.deleteUser("u1");
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/users/u1"]);
  });

  test("getSettings calls /api/admin/settings", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({});
    await adminApi.getSettings();
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/settings"]);
  });

  test("updateSettings patches partial settings", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await adminApi.updateSettings({ instanceName: "x", registrationOpen: true });
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/settings", { instanceName: "x", registrationOpen: true }]);
  });

  test("inviteUser posts email+role (default 'user')", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await adminApi.inviteUser("a@b.com");
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/invite", { email: "a@b.com", role: "user" }]);
  });

  test("inviteUser passes explicit role", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await adminApi.inviteUser("a@b.com", "admin");
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/invite", { email: "a@b.com", role: "admin" }]);
  });

  test("listInvitations calls /api/admin/invitations", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue([]);
    await adminApi.listInvitations();
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/invitations"]);
  });

  test("getIntegrations calls /api/admin/integrations", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ integrations: [], encryptionEnabled: false });
    await adminApi.getIntegrations();
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/integrations"]);
  });

  test("updateIntegration patches key+value", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await adminApi.updateIntegration("openai_api_key", "sk-xxx");
    assert.deepEqual(stub.mock.calls[0], ["/api/admin/integrations", { key: "openai_api_key", value: "sk-xxx" }]);
  });
});

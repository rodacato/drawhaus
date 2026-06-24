import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { adminApi, siteApi } from "../api/admin";

describe("siteApi", () => {
  beforeEach(() => mock.restoreAll());

  test("getStatus calls /api/site/status", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ maintenanceMode: false, instanceName: "drawhaus" }));
    const result = await siteApi.getStatus();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/site/status"]);
    assert.deepEqual(result, { maintenanceMode: false, instanceName: "drawhaus" });
  });
});

describe("adminApi", () => {
  beforeEach(() => mock.restoreAll());

  test("getMetrics calls /api/admin/metrics", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ users: 5 }));
    await adminApi.getMetrics();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/metrics"]);
  });

  test("listUsers calls /api/admin/users", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await adminApi.listUsers();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/users"]);
  });

  test("updateUser patches role+disabled", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({}));
    await adminApi.updateUser("u1", { role: "admin", disabled: false });
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/users/u1", { role: "admin", disabled: false }]);
  });

  test("deleteUser deletes user URL", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await adminApi.deleteUser("u1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/users/u1"]);
  });

  test("getSettings calls /api/admin/settings", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({}));
    await adminApi.getSettings();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/settings"]);
  });

  test("updateSettings patches partial settings", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({}));
    await adminApi.updateSettings({ instanceName: "x", registrationOpen: true });
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/settings", { instanceName: "x", registrationOpen: true }]);
  });

  test("inviteUser posts email+role (default 'user')", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await adminApi.inviteUser("a@b.com");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/invite", { email: "a@b.com", role: "user" }]);
  });

  test("inviteUser passes explicit role", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await adminApi.inviteUser("a@b.com", "admin");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/invite", { email: "a@b.com", role: "admin" }]);
  });

  test("listInvitations calls /api/admin/invitations", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve([]));
    await adminApi.listInvitations();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/invitations"]);
  });

  test("getIntegrations calls /api/admin/integrations", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ integrations: [], encryptionEnabled: false }));
    await adminApi.getIntegrations();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/integrations"]);
  });

  test("updateIntegration patches key+value", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({}));
    await adminApi.updateIntegration("openai_api_key", "sk-xxx");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/admin/integrations", { key: "openai_api_key", value: "sk-xxx" }]);
  });
});

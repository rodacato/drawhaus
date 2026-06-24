import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { authApi } from "../api/auth";

describe("authApi", () => {
  beforeEach(() => mock.restoreAll());

  test("login posts email+password", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ user: { id: "u1" } }));
    const result = await authApi.login("a@b.com", "pw");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/login", { email: "a@b.com", password: "pw" }]);
    assert.deepEqual(result, { user: { id: "u1" } });
  });

  test("register posts name+email+password", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ ok: true }));
    await authApi.register("Adrian", "a@b.com", "pw");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/register", { name: "Adrian", email: "a@b.com", password: "pw" }]);
  });

  test("logout posts with no body", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await authApi.logout();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/logout"]);
  });

  test("getMe unwraps .user from response", async () => {
    mock.method(api, "get", () => Promise.resolve({ user: { id: "u1", name: "A" } }));
    const result = await authApi.getMe();
    assert.deepEqual(result, { id: "u1", name: "A" });
  });

  test("updateProfile patches data", async () => {
    const stub = mock.method(api, "patch", () => Promise.resolve({}));
    await authApi.updateProfile({ name: "New" });
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/me", { name: "New" }]);
  });

  test("changePassword posts current+new", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await authApi.changePassword("old", "new");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/change-password", { currentPassword: "old", newPassword: "new" }]);
  });

  test("getSetupStatus gets status endpoint", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ needsSetup: true }));
    const result = await authApi.getSetupStatus();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/setup-status"]);
    assert.deepEqual(result, { needsSetup: true });
  });

  test("resolveInvite encodes token in URL", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ email: "x@y.com", role: "user" }));
    await authApi.resolveInvite("tok123");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/invite/tok123"]);
  });

  test("acceptInvite posts token+name+password", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await authApi.acceptInvite("tok", "A", "pw");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/accept-invite", { token: "tok", name: "A", password: "pw" }]);
  });

  test("forgotPassword posts email", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await authApi.forgotPassword("a@b.com");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/forgot-password", { email: "a@b.com" }]);
  });

  test("validateResetToken gets token URL", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ valid: true }));
    await authApi.validateResetToken("tok");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/reset-password/tok"]);
  });

  test("resetPassword posts token+newPassword", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await authApi.resetPassword("tok", "newpw");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/reset-password", { token: "tok", newPassword: "newpw" }]);
  });

  test("deleteAccount sends password in body via data option", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await authApi.deleteAccount("pw");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/account", { data: { password: "pw" } }]);
  });

  test("unlinkProvider deletes provider URL", async () => {
    const stub = mock.method(api, "delete", () => Promise.resolve({}));
    await authApi.unlinkProvider("github");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/auth/link/github"]);
  });
});

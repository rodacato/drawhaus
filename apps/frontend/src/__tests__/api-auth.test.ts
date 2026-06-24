import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { authApi } from "../api/auth";

describe("authApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("login posts email+password", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ user: { id: "u1" } });
    const result = await authApi.login("a@b.com", "pw");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/login", { email: "a@b.com", password: "pw" }]);
    assert.deepEqual(result, { user: { id: "u1" } });
  });

  test("register posts name+email+password", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ ok: true });
    await authApi.register("Adrian", "a@b.com", "pw");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/register", { name: "Adrian", email: "a@b.com", password: "pw" }]);
  });

  test("logout posts with no body", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await authApi.logout();
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/logout"]);
  });

  test("getMe unwraps .user from response", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ user: { id: "u1", name: "A" } });
    const result = await authApi.getMe();
    assert.deepEqual(result, { id: "u1", name: "A" });
  });

  test("updateProfile patches data", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await authApi.updateProfile({ name: "New" });
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/me", { name: "New" }]);
  });

  test("changePassword posts current+new", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await authApi.changePassword("old", "new");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/change-password", { currentPassword: "old", newPassword: "new" }]);
  });

  test("getSetupStatus gets status endpoint", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ needsSetup: true });
    const result = await authApi.getSetupStatus();
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/setup-status"]);
    assert.deepEqual(result, { needsSetup: true });
  });

  test("resolveInvite encodes token in URL", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ email: "x@y.com", role: "user" });
    await authApi.resolveInvite("tok123");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/invite/tok123"]);
  });

  test("acceptInvite posts token+name+password", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await authApi.acceptInvite("tok", "A", "pw");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/accept-invite", { token: "tok", name: "A", password: "pw" }]);
  });

  test("forgotPassword posts email", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await authApi.forgotPassword("a@b.com");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/forgot-password", { email: "a@b.com" }]);
  });

  test("validateResetToken gets token URL", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ valid: true });
    await authApi.validateResetToken("tok");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/reset-password/tok"]);
  });

  test("resetPassword posts token+newPassword", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await authApi.resetPassword("tok", "newpw");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/reset-password", { token: "tok", newPassword: "newpw" }]);
  });

  test("deleteAccount sends password in body via data option", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await authApi.deleteAccount("pw");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/account", { data: { password: "pw" } }]);
  });

  test("unlinkProvider deletes provider URL", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await authApi.unlinkProvider("github");
    assert.deepEqual(stub.mock.calls[0], ["/api/auth/link/github"]);
  });
});

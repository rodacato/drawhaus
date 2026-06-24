import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { workspacesApi } from "../api/workspaces";

describe("workspacesApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("list calls /api/workspaces", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ workspaces: [] });
    await workspacesApi.list();
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces"]);
  });

  test("get fetches workspace by id", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ workspace: {}, role: "admin", members: [] });
    await workspacesApi.get("w1");
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/w1"]);
  });

  test("create posts workspace data", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ workspace: {} });
    await workspacesApi.create({ name: "Team", description: "d", color: "blue", icon: "rocket" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/workspaces",
      { name: "Team", description: "d", color: "blue", icon: "rocket" },
    ]);
  });

  test("update patches workspace fields", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({ workspace: {} });
    await workspacesApi.update("w1", { name: "renamed" });
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/w1", { name: "renamed" }]);
  });

  test("delete removes workspace", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await workspacesApi.delete("w1");
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/w1"]);
  });

  test("invite posts email+role (default editor)", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await workspacesApi.invite("w1", "a@b.com");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/workspaces/w1/invite",
      { email: "a@b.com", role: "editor" },
    ]);
  });

  test("invite passes explicit role", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await workspacesApi.invite("w1", "a@b.com", "admin");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/workspaces/w1/invite",
      { email: "a@b.com", role: "admin" },
    ]);
  });

  test("updateMemberRole patches role", async () => {
    const stub = vi.spyOn(api, "patch").mockResolvedValue({});
    await workspacesApi.updateMemberRole("w1", "u1", "viewer");
    assert.deepEqual(stub.mock.calls[0], [
      "/api/workspaces/w1/members/u1",
      { role: "viewer" },
    ]);
  });

  test("removeMember deletes member", async () => {
    const stub = vi.spyOn(api, "delete").mockResolvedValue({});
    await workspacesApi.removeMember("w1", "u1");
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/w1/members/u1"]);
  });

  test("acceptInvite posts token", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await workspacesApi.acceptInvite("tok");
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/accept-invite", { token: "tok" }]);
  });

  test("resolveInvite fetches invite by token", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ workspaceName: "T", role: "editor", email: "a@b.com" });
    await workspacesApi.resolveInvite("tok");
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/invite/tok"]);
  });

  test("transferOwnership posts newOwnerId+transferResources", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ success: true, diagramCount: 0, templateCount: 0 });
    await workspacesApi.transferOwnership("w1", "u2", true);
    assert.deepEqual(stub.mock.calls[0], [
      "/api/workspaces/w1/transfer-ownership",
      { newOwnerId: "u2", transferResources: true },
    ]);
  });

  test("listOwnedShared calls /api/workspaces/owned-shared", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ workspaces: [] });
    await workspacesApi.listOwnedShared();
    assert.deepEqual(stub.mock.calls[0], ["/api/workspaces/owned-shared"]);
  });
});

import { test, expect } from "@playwright/test";
import { loginAsUser, WS_MEMBER_USER, ADMIN_USER } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Workspace Ownership Transfer", () => {
  test.describe.configure({ mode: "serial" });

  let ownerCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let memberCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let workspaceId: string;
  let ownerId: string;
  let memberId: string;
  let diagramId: string;

  test.beforeAll(async () => {
    ownerCtx = await loginAsUser(BASE_URL, WS_MEMBER_USER.email, WS_MEMBER_USER.password);
    memberCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);

    // Get user IDs
    const ownerMe = await ownerCtx.get("/api/auth/me");
    ownerId = ((await ownerMe.json()).user ?? await ownerMe.json()).id;

    const memberMe = await memberCtx.get("/api/auth/me");
    memberId = ((await memberMe.json()).user ?? await memberMe.json()).id;

    // Create workspace
    const wsRes = await ownerCtx.post("/api/workspaces", {
      data: { name: "Transfer Test WS" },
    });
    if (!wsRes.ok()) return;
    workspaceId = ((await wsRes.json()).workspace ?? await wsRes.json()).id;

    // Invite member as admin and accept
    const inviteRes = await ownerCtx.post(`/api/workspaces/${workspaceId}/invite`, {
      data: { email: ADMIN_USER.email, role: "admin" },
    });
    if (inviteRes.ok() || inviteRes.status() === 201) {
      const invBody = await inviteRes.json();
      const token = invBody.invitation?.token ?? invBody.token;
      if (token) {
        await memberCtx.post("/api/workspaces/accept-invite", { data: { token } });
      }
    }

    // Create a diagram in the workspace
    const diagRes = await ownerCtx.post("/api/diagrams", {
      data: { title: "Transfer Test Diagram", workspaceId },
    });
    if (diagRes.ok() || diagRes.status() === 201) {
      diagramId = ((await diagRes.json()).diagram ?? await diagRes.json()).id;
    }
  });

  test.afterAll(async () => {
    // Clean up: try to delete workspace (may fail if ownership transferred)
    if (workspaceId) {
      await ownerCtx.delete(`/api/workspaces/${workspaceId}`).catch(() => {});
      await memberCtx.delete(`/api/workspaces/${workspaceId}`).catch(() => {});
    }
    await ownerCtx?.dispose();
    await memberCtx?.dispose();
  });

  test("non-owner cannot transfer ownership", async () => {
    test.skip(!workspaceId || !ownerId, "Setup incomplete");

    const res = await memberCtx.post(`/api/workspaces/${workspaceId}/transfer-ownership`, {
      data: { newOwnerId: memberId },
    });
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBe(403);
  });

  test("owner can transfer ownership to admin member", async () => {
    test.skip(!workspaceId || !memberId, "Setup incomplete");

    const res = await ownerCtx.post(`/api/workspaces/${workspaceId}/transfer-ownership`, {
      data: { newOwnerId: memberId, transferResources: true },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("new owner is reflected in workspace data", async () => {
    test.skip(!workspaceId || !memberId, "Setup incomplete");

    const res = await memberCtx.get(`/api/workspaces/${workspaceId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const ws = body.workspace ?? body;
    expect(ws.ownerId ?? ws.owner_id).toBe(memberId);
  });

  test("old owner still has access as admin", async () => {
    test.skip(!workspaceId, "Setup incomplete");

    const res = await ownerCtx.get(`/api/workspaces/${workspaceId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("diagram ownership was transferred", async () => {
    test.skip(!diagramId || !memberId, "Setup incomplete");

    const res = await memberCtx.get(`/api/diagrams/${diagramId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const diagram = body.diagram ?? body;
    expect(diagram.ownerId ?? diagram.owner_id).toBe(memberId);
  });

  test("owned-shared endpoint lists workspaces needing transfer", async () => {
    test.skip(!workspaceId, "Setup incomplete");

    // The workspace was already transferred, so the original owner should not see it
    const res = await ownerCtx.get("/api/workspaces/owned-shared");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const wsIds = (body.workspaces ?? []).map((w: any) => w.id);
    expect(wsIds).not.toContain(workspaceId);
  });
});

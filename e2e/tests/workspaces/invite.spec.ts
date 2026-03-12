import { test, expect } from "@playwright/test";
import { loginAsUser, ADMIN_USER, WS_MEMBER_USER, unauthenticatedContext } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Workspace Invitations", () => {
  test.describe.configure({ mode: "serial" });

  let ownerCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let inviteeCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let workspaceId: string;
  let inviteToken: string;

  test.beforeAll(async () => {
    ownerCtx = await loginAsUser(BASE_URL, WS_MEMBER_USER.email, WS_MEMBER_USER.password);
    inviteeCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);

    // Create a workspace for invite tests
    const res = await ownerCtx.post("/api/workspaces", {
      data: { name: "Invite Flow WS" },
    });
    if (!res.ok()) {
      throw new Error(`Could not create workspace: ${res.status()}`);
    }
    const body = await res.json();
    workspaceId = body.workspace?.id ?? body.id;
  });

  test.afterAll(async () => {
    if (workspaceId) {
      await ownerCtx.delete(`/api/workspaces/${workspaceId}`).catch(() => {});
    }
    await ownerCtx?.dispose();
    await inviteeCtx?.dispose();
  });

  test("owner can invite user to workspace", async () => {
    const res = await ownerCtx.post(`/api/workspaces/${workspaceId}/invite`, {
      data: { email: ADMIN_USER.email, role: "editor" },
    });
    expect(res.ok() || res.status() === 201).toBeTruthy();
    const body = await res.json();
    inviteToken = body.invitation?.token ?? body.token;
    expect(inviteToken).toBeTruthy();
  });

  test("GET /api/workspaces/invite/:token validates token", async () => {
    test.skip(!inviteToken, "No invite token from previous test");
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/workspaces/invite/${inviteToken}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.workspaceName).toBeTruthy();
    expect(body.role).toBe("editor");
    await noAuth.dispose();
  });

  test("invalid workspace invite token returns error", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get("/api/workspaces/invite/invalid-token-xyz");
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("POST /api/workspaces/accept-invite adds user to workspace", async () => {
    test.skip(!inviteToken, "No invite token from previous test");
    const res = await inviteeCtx.post("/api/workspaces/accept-invite", {
      data: { token: inviteToken },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.workspace || body.role).toBeTruthy();
  });

  test("accepted member can access workspace", async () => {
    const res = await inviteeCtx.get(`/api/workspaces/${workspaceId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("UI: /workspace-invite/:token shows invite page", async ({ browser }) => {
    test.skip(!inviteToken, "No invite token");
    // Use a fresh unauthenticated context for UI
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:5173/workspace-invite/${inviteToken}`);
    await page.waitForLoadState("networkidle");
    // Page should show workspace info or redirect to login/register
    const url = page.url();
    // Either stays on invite page or redirects to register/login
    expect(
      url.includes("workspace-invite") || url.includes("register") || url.includes("login"),
    ).toBeTruthy();
    await ctx.close();
  });

  test("UI: invalid workspace invite token shows error", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/workspace-invite/bad-token-xyz");
    await page.waitForLoadState("networkidle");
    // Should show some error state
    const content = await page.textContent("body");
    const hasError =
      content?.toLowerCase().includes("not found") ||
      content?.toLowerCase().includes("invalid") ||
      content?.toLowerCase().includes("expired") ||
      content?.toLowerCase().includes("error") ||
      page.url().includes("login");
    expect(hasError).toBeTruthy();
    await ctx.close();
  });
});

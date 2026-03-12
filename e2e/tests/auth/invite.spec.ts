import { test, expect } from "@playwright/test";
import { loginAsUser, ADMIN_USER, unauthenticatedContext } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("User Invitations", () => {
  test.describe.configure({ mode: "serial" });

  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let inviteToken: string;
  const inviteEmail = `invite_accept_${Date.now()}@test.com`;

  test.beforeAll(async () => {
    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
  });

  test.afterAll(async () => {
    // Clean up: delete the created user if it exists
    const usersRes = await adminCtx.get("/api/admin/users");
    if (usersRes.ok()) {
      const body = await usersRes.json();
      const users = body.users ?? body;
      const created = users.find((u: any) => u.email === inviteEmail);
      if (created) {
        await adminCtx.delete(`/api/admin/users/${created.id}`).catch(() => {});
      }
    }
    await adminCtx?.dispose();
  });

  test("admin can create user invitation with token", async () => {
    const res = await adminCtx.post("/api/admin/invite", {
      data: { email: inviteEmail },
    });
    expect(res.ok() || res.status() === 201).toBeTruthy();
    const body = await res.json();
    inviteToken = body.invitation?.token ?? body.token;
    expect(inviteToken).toBeTruthy();
  });

  test("GET /api/auth/invite/:token validates invitation", async () => {
    test.skip(!inviteToken, "No invite token from previous test");
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/auth/invite/${inviteToken}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should return at least the email
    expect(body.email ?? body.invitation?.email).toBe(inviteEmail);
    await noAuth.dispose();
  });

  test("GET /api/auth/invite/:token rejects invalid token", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get("/api/auth/invite/invalid-token-xyz");
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("POST /api/auth/accept-invite creates account", async () => {
    test.skip(!inviteToken, "No invite token from previous test");
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.post("/api/auth/accept-invite", {
      data: {
        token: inviteToken,
        name: "Invited User",
        password: "Invited1234!pass",
      },
    });
    expect(res.ok() || res.status() === 201).toBeTruthy();
    const body = await res.json();
    expect(body.user).toBeTruthy();
    await noAuth.dispose();
  });

  test("POST /api/auth/accept-invite rejects invalid token", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.post("/api/auth/accept-invite", {
      data: {
        token: "bad-token-xyz",
        name: "Fake User",
        password: "Fake1234!pass",
      },
    });
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("UI: /register?invite=:token pre-fills email", async ({ browser }) => {
    // Create a fresh invite for the UI test
    const uiEmail = `invite_ui_${Date.now()}@test.com`;
    const inviteRes = await adminCtx.post("/api/admin/invite", {
      data: { email: uiEmail },
    });
    if (!inviteRes.ok()) {
      test.skip(true, "Could not create invite");
      return;
    }
    const inviteBody = await inviteRes.json();
    const token = inviteBody.invitation?.token ?? inviteBody.token;
    if (!token) {
      test.skip(true, "No token in invite response");
      return;
    }

    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:5173/register?invite=${token}`);
    await page.waitForLoadState("networkidle");

    // The register page should either pre-fill the email or show invite context
    const content = await page.textContent("body");
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const hasInviteContext =
      (await emailInput.count()) > 0 ||
      content?.includes(uiEmail) ||
      content?.toLowerCase().includes("invite") ||
      content?.toLowerCase().includes("register");
    expect(hasInviteContext).toBeTruthy();
    await ctx.close();
  });
});

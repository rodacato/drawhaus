import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";
import { loginAsUser, ADMIN_USER } from "../../fixtures/multi-user.fixture";

test.describe("Smoke Tests @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("health check returns version and db status", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
    expect(body.version).toBeTruthy();
    expect(typeof body.uptime).toBe("number");
  });

  test("version endpoint returns build info", async ({ request }) => {
    const res = await request.get("/api/version");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.version).toBeTruthy();
    expect(body.commit).toBeTruthy();
    expect(body.deployedAt).toBeTruthy();
  });

  test("login → dashboard", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("e2e@drawhaus.test");
    await page.locator('input[name="password"]').fill("Test1234!pass");
    await page.locator('input[name="password"]').press("Enter");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await context.close();
  });

  test("create diagram → open board", async ({ request, page }) => {
    const diagram = await createDiagram(request, "Smoke Board Test");
    expect(diagram.id).toBeTruthy();

    const res = await request.get(`/api/diagrams/${diagram.id}`);
    expect(res.ok()).toBeTruthy();

    // Navigate to board and verify it loads
    await page.goto(`/board/${diagram.id}`);
    await expect(page.locator(".excalidraw")).toBeVisible({ timeout: 15_000 });
  });

  test("list workspaces", async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const workspaces = body.workspaces ?? body;
    expect(Array.isArray(workspaces)).toBeTruthy();
    expect(workspaces.length).toBeGreaterThan(0);
  });

  test("share diagram → guest sees join form", async ({ request, browser }) => {
    const diagram = await createDiagram(request, "Smoke Share");
    const shareRes = await request.post(`/api/share/${diagram.id}`, {
      data: { role: "viewer" },
    });
    expect(shareRes.ok()).toBeTruthy();
    const shareBody = await shareRes.json();
    const token = shareBody.shareLink?.token ?? shareBody.token;

    const guestContext = await browser.newContext();
    const page = await guestContext.newPage();
    await page.goto(`/share/${token}`);
    await expect(page.getByText(/your name/i)).toBeVisible({ timeout: 10_000 });
    await guestContext.close();
  });

  test("search diagrams", async ({ request }) => {
    await createDiagram(request, "SmokeSearchTarget");
    const res = await request.get("/api/diagrams/search?q=SmokeSearchTarget");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.diagrams).toBeDefined();
  });

  test("admin settings accessible", async () => {
    const admin = await loginAsUser("http://localhost:5173", ADMIN_USER.email, ADMIN_USER.password);
    const res = await admin.get("/api/admin/settings");
    expect(res.ok()).toBeTruthy();
    await admin.dispose();
  });

  test("setup status reports completed", async ({ request }) => {
    const res = await request.get("/api/auth/setup-status");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.needsSetup).toBe(false);
  });

  test("logout clears session", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    await page.request.post("/api/auth/logout");
    const meRes = await page.request.get("/api/auth/me");
    const meBody = await meRes.json();
    expect(meBody.user).toBeFalsy();
    await context.close();
  });
});

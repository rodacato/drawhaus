import { randomUUID } from "node:crypto";
import { test, expect, loginApi, PRIMARY_USER, SIGNED_OUT } from "../../fixtures/test";
import { createDiagram, createShareLink } from "../../fixtures/api";

test.describe("Smoke Tests @smoke", () => {
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

  test("login → dashboard", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(PRIMARY_USER.email);
    await page.locator('input[name="password"]').fill(PRIMARY_USER.password);
    await page.locator('input[name="password"]').press("Enter");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("create diagram → open board", async ({ request, page }) => {
    const diagram = await createDiagram(request, { title: "Smoke Board Test" });

    await page.goto(`/board/${diagram.id}`);

    await expect(page.locator(".excalidraw canvas").first()).toBeVisible({ timeout: 30_000 });
  });

  test("the user has a personal workspace", async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const { workspaces } = (await res.json()) as { workspaces: { isPersonal: boolean }[] };
    expect(workspaces.some((w) => w.isPersonal)).toBe(true);
  });

  test("share diagram → guest sees join form", async ({ request, openAs }) => {
    const diagram = await createDiagram(request, { title: "Smoke Share" });
    const token = await createShareLink(request, diagram.id, "viewer");

    const page = await openAs(SIGNED_OUT);
    await page.goto(`/share/${token}`);

    await expect(page.getByText(/your name/i)).toBeVisible({ timeout: 10_000 });
  });

  test("search finds a diagram by title", async ({ request }) => {
    const title = `SmokeSearch_${randomUUID().slice(0, 8)}`;
    await createDiagram(request, { title });

    const res = await request.get(`/api/diagrams/search?q=${title}`);
    expect(res.ok()).toBeTruthy();
    const { diagrams } = (await res.json()) as { diagrams: { title: string }[] };
    expect(diagrams.map((d) => d.title)).toContain(title);
  });

  test("admin settings accessible", async ({ adminApi }) => {
    expect((await adminApi.get("/api/admin/settings")).ok()).toBeTruthy();
  });

  test("setup status reports completed", async ({ request }) => {
    const res = await request.get("/api/auth/setup-status");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).needsSetup).toBe(false);
  });

  test("logout ends that session only", async ({ request }) => {
    const session = await loginApi(PRIMARY_USER.email, PRIMARY_USER.password);

    expect((await session.post("/api/auth/logout")).ok()).toBeTruthy();

    expect((await (await session.get("/api/auth/me")).json()).user).toBeFalsy();
    expect((await (await request.get("/api/auth/me")).json()).user.email).toBe(PRIMARY_USER.email);
    await session.dispose();
  });
});

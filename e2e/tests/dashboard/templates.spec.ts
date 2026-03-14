import { test, expect } from "@playwright/test";
import { API_TESTS_USER } from "../../fixtures/multi-user.fixture";

test.use({ storageState: API_TESTS_USER.authFile });

test.describe("Dashboard — My Templates", () => {
  test.describe.configure({ mode: "serial" });

  let templateId: string;

  test.beforeAll(async ({ request }) => {
    // Create a template via API so the view has content
    const res = await request.post("/api/templates", {
      data: {
        title: "Dashboard E2E Template",
        description: "For testing the templates view",
        category: "architecture",
        elements: [{ type: "rectangle", id: "r1", x: 0, y: 0, width: 100, height: 100 }],
        appState: { zoom: 1 },
      },
    });
    if (res.ok()) {
      const body = await res.json();
      templateId = (body.template ?? body).id;
    }
  });

  test("sidebar shows My Templates nav item", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    const sidebar = page.locator("nav").first();
    await expect(sidebar.getByText("My Templates")).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to My Templates view", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    await page.locator("nav").getByText("My Templates").first().click({ force: true });
    await expect(page.locator("main h2").first()).toContainText("My Templates", { timeout: 10_000 });
  });

  test("displays template cards in the grid", async ({ page }) => {
    test.skip(!templateId, "Could not create test template");

    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    await page.locator("nav").getByText("My Templates").first().click({ force: true });
    await page.waitForTimeout(1000);

    await expect(page.getByText("Dashboard E2E Template").first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state when no templates exist", async ({ page, request }) => {
    // Delete ALL templates (not just the one from this run — others may exist from prior runs)
    const listRes = await request.get("/api/templates");
    if (listRes.ok()) {
      const body = await listRes.json();
      const templates = body.templates ?? body;
      for (const t of templates) {
        await request.delete(`/api/templates/${t.id}`).catch(() => {});
      }
    }

    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    await page.locator("nav").getByText("My Templates").first().click({ force: true });
    await page.waitForTimeout(1000);

    await expect(page.getByText(/no custom templates/i)).toBeVisible({ timeout: 10_000 });
  });
});

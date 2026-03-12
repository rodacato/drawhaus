import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";

test.describe("Dashboard", () => {
  test("loads dashboard with heading", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await expect(dashboard.heading).toBeVisible();
  });

  test("can create a new diagram", async ({ page, request }) => {
    // Create diagram via API (more stable than UI button)
    const res = await request.post("/api/diagrams", {
      data: { title: "E2E Dashboard Test" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const id = body.diagram?.id ?? body.id;
    expect(id).toBeTruthy();
  });

  test("can search diagrams", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await dashboard.searchDiagrams("Untitled");
    await expect(page).toHaveURL(/[?&]q=Untitled/);
  });

  test("shows empty state message when no results", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await dashboard.searchDiagrams("nonexistent_diagram_xyz_12345");
    await expect(
      page.getByText(/no diagrams match/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("sidebar shows Recent and Starred sections", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    const sidebar = page.locator("nav").first();
    await expect(sidebar.getByText("Recent")).toBeVisible({ timeout: 15_000 });
    await expect(sidebar.getByText("Starred")).toBeVisible();
  });

  test("can navigate to Recent view", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await page.locator("nav").getByText("Recent").first().click({ force: true, timeout: 15_000 });
    await expect(dashboard.heading).toContainText("Recent", { timeout: 10_000 });
  });

  test("can navigate to Starred view", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await page.locator("nav").getByText("Starred").first().click({ force: true, timeout: 15_000 });
    await expect(dashboard.heading).toContainText("Starred", { timeout: 10_000 });
  });
});

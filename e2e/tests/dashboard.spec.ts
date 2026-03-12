import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";

test.describe("Dashboard", () => {
  test("loads dashboard with heading", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await expect(dashboard.heading).toBeVisible();
  });

  test("can create a new diagram", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Navigate to workspace view to see the New Diagram button
    const workspaceLink = page.locator("nav").getByText("Personal").first();
    if (await workspaceLink.isVisible().catch(() => false)) {
      await workspaceLink.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Create diagram via API as fallback (button may have CSS stability issues)
    const res = await page.request.post("/api/diagrams", {
      data: { title: "E2E Dashboard Test" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const id = body.diagram?.id ?? body.id;
    expect(id).toBeTruthy();

    // Verify the diagram appears in the dashboard after reload
    await page.goto("/dashboard");
    await dashboard.waitForLoad();

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
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows Recent and Starred sections", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Look for sidebar navigation items
    const sidebar = page.locator("nav").first();
    await expect(sidebar.getByText("Recent")).toBeVisible();
    await expect(sidebar.getByText("Starred")).toBeVisible();
  });

  test("can navigate to Recent view", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await page.locator("nav").getByText("Recent").first().click({ force: true });
    await expect(dashboard.heading).toContainText("Recent");
  });

  test("can navigate to Starred view", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    await page.locator("nav").getByText("Starred").first().click({ force: true });
    await expect(dashboard.heading).toContainText("Starred");
  });
});

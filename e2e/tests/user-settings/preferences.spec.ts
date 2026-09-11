import { test, expect } from "../../fixtures/test";

test.describe("Settings Tabs", () => {
  test("billing tab loads", async ({ page }) => {
    await page.goto("/settings?tab=billing");
    await expect(page.getByText(/billing/i).first()).toBeVisible({ timeout: 15_000 });
    const content = (await page.textContent("body"))?.toLowerCase() ?? "";
    expect(/billing|self-hosted|plan/.test(content)).toBe(true);
  });

  test("integrations tab loads", async ({ page }) => {
    await page.goto("/settings?tab=integrations");
    await expect(page.getByText(/integrations/i).first()).toBeVisible({ timeout: 15_000 });
    const content = (await page.textContent("body"))?.toLowerCase() ?? "";
    expect(/integration|google|drive|connect/.test(content)).toBe(true);
  });

  test("preferences tab shows the appearance options", async ({ page }) => {
    await page.goto("/settings?tab=preferences");

    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Light", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dark", exact: true })).toBeVisible();
  });

  test("choosing the dark theme persists across reloads", async ({ page }) => {
    await page.goto("/settings?tab=preferences");

    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  });
});

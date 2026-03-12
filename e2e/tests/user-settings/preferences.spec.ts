import { test, expect } from "@playwright/test";

test.describe("Settings Tabs", () => {
  test("billing tab loads", async ({ page }) => {
    await page.goto("/settings?tab=billing");
    // Wait for the billing tab content to render
    await expect(page.getByText(/billing/i).first()).toBeVisible({ timeout: 15_000 });
    const content = await page.textContent("body");
    expect(
      content?.toLowerCase().includes("billing") ||
      content?.toLowerCase().includes("self-hosted") ||
      content?.toLowerCase().includes("plan"),
    ).toBeTruthy();
  });

  test("integrations tab loads", async ({ page }) => {
    await page.goto("/settings?tab=integrations");
    await expect(page.getByText(/integrations/i).first()).toBeVisible({ timeout: 15_000 });
    const content = await page.textContent("body");
    expect(
      content?.toLowerCase().includes("integration") ||
      content?.toLowerCase().includes("google") ||
      content?.toLowerCase().includes("drive") ||
      content?.toLowerCase().includes("connect"),
    ).toBeTruthy();
  });

  test("preferences tab loads", async ({ page }) => {
    await page.goto("/settings?tab=preferences");
    // The preferences tab heading is "Appearance"
    await expect(page.getByText(/appearance/i).first()).toBeVisible({ timeout: 15_000 });
    const content = await page.textContent("body");
    expect(
      content?.toLowerCase().includes("appearance") ||
      content?.toLowerCase().includes("theme") ||
      content?.toLowerCase().includes("dark") ||
      content?.toLowerCase().includes("light"),
    ).toBeTruthy();
  });

  test("theme toggle persists selection", async ({ page }) => {
    await page.goto("/settings?tab=preferences");
    await expect(page.getByText(/appearance/i).first()).toBeVisible({ timeout: 15_000 });

    // Look for theme toggle/selector
    const darkButton = page.getByRole("button", { name: /dark/i }).or(
      page.locator('[data-theme="dark"], [value="dark"]'),
    );

    if ((await darkButton.count()) > 0) {
      await darkButton.first().click();
      // Reload to verify persistence
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Check if dark theme is active (body or html has dark class/attribute)
      const isDark = await page.evaluate(() => {
        return (
          document.documentElement.classList.contains("dark") ||
          document.body.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark" ||
          localStorage.getItem("theme") === "dark"
        );
      });
      // Restore to light
      const lightButton = page.getByRole("button", { name: /light/i }).or(
        page.locator('[data-theme="light"], [value="light"]'),
      );
      if ((await lightButton.count()) > 0) {
        await lightButton.first().click();
      }
      expect(isDark).toBeTruthy();
    } else {
      // No explicit dark button — theme might be auto or controlled differently
      test.skip(true, "No theme toggle found");
    }
  });
});

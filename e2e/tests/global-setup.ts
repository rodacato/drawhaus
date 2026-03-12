import { test as setup, expect } from "@playwright/test";

const TEST_USER = {
  name: "E2E Test User",
  email: "e2e@drawhaus.test",
  password: "Test1234!pass",
};

/**
 * Global setup: logs in the test user via the UI and saves the
 * authenticated browser state for reuse across all tests.
 *
 * Prerequisites: run `npm run db:seed` to create the test user.
 */
setup("create test user and save auth state", async ({ page }) => {
  // Check if this is a fresh DB (no users)
  const statusRes = await page.request.get("/api/auth/setup-status");
  const { needsSetup } = await statusRes.json();

  if (needsSetup) {
    // First-run: create admin via setup page
    await page.goto("/setup");
    await page.locator('input[name="name"]').fill(TEST_USER.name);
    await page.locator('input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[name="password"]').fill(TEST_USER.password);
    await page.getByRole("button", { name: /create admin/i }).click();
  } else {
    // Login via the UI so cookies are set in the browser context
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[name="password"]').fill(TEST_USER.password);
    await page.locator('input[name="password"]').press("Enter");
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Save signed-in state for reuse
  await page.context().storageState({ path: "tests/.auth/user.json" });
});

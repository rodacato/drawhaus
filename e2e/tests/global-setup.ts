import { test as setup, expect } from "@playwright/test";
import { request as playwrightRequest } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

const TEST_USER = {
  name: "E2E Test User",
  email: "e2e@drawhaus.test",
  password: "Test1234!pass",
};

/** Domain-specific users to avoid resource conflicts between test suites */
const DOMAIN_USERS = [
  { name: "Admin User", email: "admin@drawhaus.test", password: "admin1234", authFile: "tests/.auth/admin.json", makeAdmin: true },
  { name: "WS CRUD User", email: "e2e-ws-crud@drawhaus.test", password: "Test1234!pass", authFile: "tests/.auth/ws-crud.json" },
  { name: "WS Members User", email: "e2e-ws-member@drawhaus.test", password: "Test1234!pass", authFile: "tests/.auth/ws-member.json" },
  { name: "API Tests User", email: "e2e-api@drawhaus.test", password: "Test1234!pass", authFile: "tests/.auth/api-tests.json" },
];

/**
 * Global setup: logs in the primary test user via the UI and saves the
 * authenticated browser state for reuse across most tests.
 * Also creates domain-specific users and saves their auth states.
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

  // Create domain-specific users and save their auth states
  for (const user of DOMAIN_USERS) {
    // Small delay between users to avoid rate limiting
    await page.waitForTimeout(1000);

    // Register user (ignore 409 if already exists)
    const registerRes = await page.request.post("/api/auth/register", {
      data: { name: user.name, email: user.email, password: user.password },
    });
    if (!registerRes.ok() && registerRes.status() !== 409) {
      console.warn(`Could not register ${user.email}: ${registerRes.status()}`);
    }

    // Promote to admin if needed (using the primary admin session from page.request)
    if ("makeAdmin" in user && user.makeAdmin && registerRes.ok()) {
      const body = await registerRes.json();
      if (body.user?.id) {
        await page.request.patch(`/api/admin/users/${body.user.id}`, {
          data: { role: "admin" },
        });
      }
    }

    await page.waitForTimeout(500);

    // Login as this user and save auth state
    const ctx = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [], origins: [] },
    });
    const loginRes = await ctx.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });
    if (loginRes.ok()) {
      await ctx.storageState({ path: user.authFile });
    } else {
      console.warn(`Could not login as ${user.email}: ${loginRes.status()}`);
    }
    await ctx.dispose();
  }
});

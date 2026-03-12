import { test, expect } from "@playwright/test";
import {
  loginAsUser,
  ADMIN_USER,
} from "../../fixtures/multi-user.fixture";

test.describe("User Registration", () => {
  test("register page shows registration form", async ({ browser }) => {
    // Use a fresh context without auth to avoid redirect to dashboard
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/register");
    await page.waitForLoadState("networkidle");

    // Check for input fields on the registration page
    const inputs = page.locator("input");
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test("POST /api/auth/register creates a new user", async ({
    request,
    baseURL,
  }) => {
    const uniqueEmail = `e2e-temp-${Date.now()}@drawhaus.test`;

    // Register a new user
    const response = await request.post("/api/auth/register", {
      data: {
        name: "Temp E2E User",
        email: uniqueEmail,
        password: "TempPass123!",
      },
    });
    expect(response.ok()).toBeTruthy();

    // Clean up: delete the temp user via admin API
    const adminCtx = await loginAsUser(
      baseURL!,
      ADMIN_USER.email,
      ADMIN_USER.password
    );

    // Find the user in admin user list
    const usersResponse = await adminCtx.get("/api/admin/users");
    expect(usersResponse.ok()).toBeTruthy();
    const usersBody = await usersResponse.json();
    const users = usersBody.users ?? usersBody;
    const tempUser = (Array.isArray(users) ? users : []).find(
      (u: any) => u.email === uniqueEmail
    );
    expect(tempUser).toBeTruthy();

    // Delete the temp user
    const deleteResponse = await adminCtx.delete(
      `/api/admin/users/${tempUser.id}`
    );
    expect(deleteResponse.ok()).toBeTruthy();

    await adminCtx.dispose();
  });

  test("POST /api/auth/register rejects duplicate email", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        name: "Duplicate User",
        email: "e2e@drawhaus.test",
        password: "Test1234!pass",
      },
    });
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

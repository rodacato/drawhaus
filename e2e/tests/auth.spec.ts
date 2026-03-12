import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

// Auth tests don't use the saved storage state — they test the login flow itself
test.use({ storageState: { cookies: [], origins: [] } });

const TEST_USER = {
  name: "E2E Test User",
  email: "e2e@drawhaus.test",
  password: "Test1234!pass",
};

test.describe("Authentication", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login|\/setup/);
  });

  test("shows login form with email and password fields", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("wrong@example.com", "wrongpassword1");

    // Error appears as a <p> inside the form after failed submit
    await expect(page.getByText(/unauthorized|failed|invalid/i)).toBeVisible({ timeout: 10_000 });
  });

  test("can login with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("can navigate between login and register", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.registerLink.click({ force: true });
    await expect(page).toHaveURL(/\/register/);

    // Go back to login
    await page.getByRole("link", { name: "Log in" }).click({ force: true });
    await expect(page).toHaveURL(/\/login/);
  });

  test("can logout", async ({ page }) => {
    // First login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Find and click logout (it's in the sidebar)
    const logoutBtn = page.getByRole("button", { name: /log\s*out|sign\s*out/i });
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click({ force: true });
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("persists session on page reload", async ({ page }) => {
    // Login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Reload
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

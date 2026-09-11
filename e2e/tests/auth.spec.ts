import { test, expect, PRIMARY_USER, SIGNED_OUT } from "../fixtures/test";
import { LoginPage } from "../pages/login.page";

test.use({ storageState: SIGNED_OUT });

test.describe("Authentication", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
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

    await expect(page.getByText(/unauthorized|failed|invalid/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("can login with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(PRIMARY_USER.email, PRIMARY_USER.password);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("can navigate between login and register", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.registerLink.click({ force: true });
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Log in" }).click({ force: true });
    await expect(page).toHaveURL(/\/login/);
  });

  test("logging out ends the session", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(PRIMARY_USER.email, PRIMARY_USER.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("persists session on page reload", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(PRIMARY_USER.email, PRIMARY_USER.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

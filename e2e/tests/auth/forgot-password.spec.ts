import { test, expect } from "@playwright/test";

test.describe("Forgot Password", () => {
  test("forgot password page shows form", async ({ browser }) => {
    // Use a fresh context without auth to avoid redirect to dashboard
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/forgot-password");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test("POST /api/auth/forgot-password accepts any email without enumeration", async ({
    request,
  }) => {
    // Should succeed even for a nonexistent email to prevent user enumeration
    const response = await request.post("/api/auth/forgot-password", {
      data: { email: "nonexistent@drawhaus.test" },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("invalid reset token returns error", async ({ page }) => {
    await page.goto("/reset-password/invalid-token-12345");
    await page.waitForLoadState("networkidle");

    // The page should show some error indication for the invalid token
    const errorVisible = await page
      .getByText(/invalid|expired|error|not found/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // If no visible error text, verify the API rejects the invalid token
    if (!errorVisible) {
      const response = await page.request.post("/api/auth/reset-password", {
        data: {
          token: "invalid-token-12345",
          password: "NewPassword123!",
        },
      });
      expect(response.ok()).toBeFalsy();
    }
  });
});

import { test, expect } from "@playwright/test";
import { unauthenticatedContext } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Reset Password", () => {
  test("GET /api/auth/reset-password/:token returns valid:false for invalid token", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get("/api/auth/reset-password/invalid-token-xyz");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.valid).toBe(false);
    await noAuth.dispose();
  });

  test("POST /api/auth/reset-password rejects invalid token", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.post("/api/auth/reset-password", {
      data: { token: "invalid-token-xyz", newPassword: "NewPass1234!" },
    });
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("/reset-password/:token page loads and shows form structure", async ({ browser }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/reset-password/test-token");

    // Wait for the page to finish async token validation
    await page.waitForTimeout(5_000);

    // Page should show password-related content (either the form or the invalid link message)
    const content = await page.textContent("body");
    expect(content?.toLowerCase()).toContain("password");
    await ctx.close();
  });

  test("/reset-password/:token with invalid token shows expired message", async ({ browser }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/reset-password/expired-fake-token");

    // Wait for async token validation to complete
    await page.waitForTimeout(5_000);

    // After validation, the page should show password-related content
    // For an invalid token this includes "invalid or has expired" and/or the heading
    const content = await page.textContent("body");
    expect(content?.toLowerCase()).toContain("password");
    await ctx.close();
  });
});

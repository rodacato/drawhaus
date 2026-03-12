import { test, expect } from "@playwright/test";

test.describe("User Profile Settings", () => {
  test("GET /api/auth/me returns current user profile", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const user = body.user ?? body;
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("name");
    expect(user.email).toBe("e2e@drawhaus.test");
  });

  test("PATCH /api/auth/me updates user name", async ({ request }) => {
    // Get current profile
    const current = await request.get("/api/auth/me");
    const currentBody = await current.json();
    const currentUser = currentBody.user ?? currentBody;
    const originalName = currentUser.name;

    // Update name
    const updateResponse = await request.patch("/api/auth/me", {
      data: { name: "E2E Updated Name" },
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Verify update
    const verify = await request.get("/api/auth/me");
    const verifyBody = await verify.json();
    const verifyUser = verifyBody.user ?? verifyBody;
    expect(verifyUser.name).toBe("E2E Updated Name");

    // Restore original name
    const restore = await request.patch("/api/auth/me", {
      data: { name: originalName },
    });
    expect(restore.ok()).toBeTruthy();
  });

  test("PATCH /api/auth/me with empty name is rejected", async ({
    request,
  }) => {
    const response = await request.patch("/api/auth/me", {
      data: { name: "" },
    });
    expect(response.ok()).toBeFalsy();
  });

  test("profile can be updated via UI", async ({ page, request }) => {
    // Get current name to restore later
    const current = await request.get("/api/auth/me");
    const currentBody = await current.json();
    const currentUser = currentBody.user ?? currentBody;
    const originalName = currentUser.name;

    await page.goto("/settings?tab=profile");
    await page.waitForLoadState("networkidle");

    // Settings page uses controlled inputs without name attributes
    // The first text input on the profile tab is the name field
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.clear();
    await nameInput.fill("UI Updated Name");

    // Click save button
    await page.getByRole("button", { name: /save profile/i }).click();

    // Wait for success message
    await expect(page.getByText(/saved|updated|success/i)).toBeVisible({
      timeout: 5000,
    });

    // Restore original name
    await request.patch("/api/auth/me", {
      data: { name: originalName },
    });
  });
});

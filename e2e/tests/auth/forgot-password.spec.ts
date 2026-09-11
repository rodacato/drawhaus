import { test, expect, PRIMARY_USER, SIGNED_OUT } from "../../fixtures/test";

test.describe("Forgot Password", () => {
  test.fixme("forgot password page shows form (bug: 401 interceptor sends signed-out visitors to /login)", async ({
    openAs,
  }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/forgot-password");

    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("answers the same for known and unknown emails", async ({ anonApi }) => {
    const unknown = await anonApi.post("/api/auth/forgot-password", {
      data: { email: "nonexistent@drawhaus.test" },
    });
    const known = await anonApi.post("/api/auth/forgot-password", {
      data: { email: PRIMARY_USER.email },
    });

    expect(unknown.status()).toBe(200);
    expect(known.status()).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });
});

import { test, expect, loginApi, uniqueEmail, PRIMARY_USER, SIGNED_OUT } from "../../fixtures/test";

test.describe("User Registration", () => {
  test("register page shows the registration form", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/register");

    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("a registered user can log in", async ({ anonApi }) => {
    const email = uniqueEmail("registered");
    const password = "TempPass123!";

    const response = await anonApi.post("/api/auth/register", {
      data: { name: "Temp E2E User", email, password },
    });
    expect(response.status()).toBe(201);

    const session = await loginApi(email, password);
    await session.dispose();
  });

  test("registering an existing email is rejected", async ({ anonApi }) => {
    const response = await anonApi.post("/api/auth/register", {
      data: { name: "Duplicate User", email: PRIMARY_USER.email, password: "Test1234!pass" },
    });
    expect(response.status()).toBe(409);
  });
});

import { test as setup, expect } from "@playwright/test";
import {
  ADMIN_USER,
  PRIMARY_AUTH_FILE,
  PRIMARY_USER,
  loginApi,
  newApiContext,
} from "../fixtures/test";

setup("create the admin and the primary user", async ({ page }) => {
  const status = await page.request.get("/api/auth/setup-status");
  const { needsSetup } = (await status.json()) as { needsSetup: boolean };

  if (needsSetup) {
    await page.goto("/setup");
    await page.locator('input[name="name"]').fill(ADMIN_USER.name);
    await page.locator('input[name="email"]').fill(ADMIN_USER.email);
    await page.locator('input[name="password"]').fill(ADMIN_USER.password);
    await page.getByRole("button", { name: /create admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  }

  const admin = await loginApi(ADMIN_USER.email, ADMIN_USER.password);
  const { user: adminUser } = await (await admin.get("/api/auth/me")).json();
  expect(adminUser.role, `${ADMIN_USER.email} must be the instance admin`).toBe("admin");
  await admin.dispose();

  const anon = await newApiContext();
  const registered = await anon.post("/api/auth/register", { data: PRIMARY_USER });
  expect([201, 409], `register ${PRIMARY_USER.email}`).toContain(registered.status());
  await anon.dispose();

  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(PRIMARY_USER.email);
  await page.locator('input[name="password"]').fill(PRIMARY_USER.password);
  await page.locator('input[name="password"]').press("Enter");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  const { user: primary } = await (await page.request.get("/api/auth/me")).json();
  expect(primary.role, `${PRIMARY_USER.email} must be a regular user`).toBe("user");
  await page.context().storageState({ path: PRIMARY_AUTH_FILE });
});

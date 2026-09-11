import type { APIRequestContext } from "@playwright/test";
import { test, expect, ADMIN_USER, PRIMARY_USER } from "../../fixtures/test";

type AdminUserRow = { id: string; email: string; role: string };

async function listUsers(adminApi: APIRequestContext) {
  const res = await adminApi.get("/api/admin/users");
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { users: AdminUserRow[] }).users;
}

async function setRole(adminApi: APIRequestContext, userId: string, role: "admin" | "user") {
  const res = await adminApi.patch(`/api/admin/users/${userId}`, { data: { role } });
  expect(res.ok(), `set role ${role}`).toBeTruthy();
}

test.describe("Admin Users", () => {
  test("lists the admin and the primary user with their roles", async ({ adminApi }) => {
    const users = await listUsers(adminApi);

    expect(users.find((u) => u.email === ADMIN_USER.email)?.role).toBe("admin");
    expect(users.find((u) => u.email === PRIMARY_USER.email)?.role).toBe("user");
  });

  test("promoting a user grants admin access and demoting revokes it", async ({
    adminApi,
    createUser,
  }) => {
    const user = await createUser("promoted");
    expect((await user.api.get("/api/admin/users")).status()).toBe(403);

    await setRole(adminApi, user.id, "admin");
    expect((await user.api.get("/api/admin/users")).status()).toBe(200);

    await setRole(adminApi, user.id, "user");
    expect((await user.api.get("/api/admin/users")).status()).toBe(403);
  });

  test("the admin sees the user table in settings", async ({ adminApi, openAs }) => {
    const page = await openAs(await adminApi.storageState());

    await page.goto("/settings?tab=admin-users");

    await expect(page.getByText(PRIMARY_USER.email).first()).toBeVisible();
  });

  test("a regular user gets no admin navigation or user data", async ({ page }) => {
    await page.goto("/settings?tab=admin-users");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Admin", { exact: true })).toHaveCount(0);
    await expect(page.getByText(ADMIN_USER.email)).toHaveCount(0);
  });

  test("metrics count every registered user", async ({ adminApi }) => {
    const res = await adminApi.get("/api/admin/metrics");
    expect(res.ok()).toBeTruthy();
    const { metrics } = (await res.json()) as { metrics: { totalUsers: number } };

    expect(metrics.totalUsers).toBe((await listUsers(adminApi)).length);
  });
});

import type { APIRequestContext } from "@playwright/test";
import { test, expect, uniqueEmail } from "../../fixtures/test";

type Settings = { instanceName: string; registrationOpen: boolean; maintenanceMode: boolean };

async function readSettings(adminApi: APIRequestContext): Promise<Settings> {
  const res = await adminApi.get("/api/admin/settings");
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { settings: Settings }).settings;
}

async function updateSettings(adminApi: APIRequestContext, patch: Partial<Settings>) {
  const res = await adminApi.patch("/api/admin/settings", { data: patch });
  expect(res.ok(), `update settings ${JSON.stringify(patch)}`).toBeTruthy();
}

async function siteStatus(api: APIRequestContext) {
  const res = await api.get("/api/site/status");
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { maintenanceMode: boolean; instanceName: string };
}

function register(api: APIRequestContext, label: string) {
  return api.post("/api/auth/register", {
    data: { name: label, email: uniqueEmail(label), password: "Test1234!pass" },
  });
}

test.describe("Admin Settings", () => {
  test("a renamed instance is visible to anonymous visitors", async ({ adminApi, anonApi }) => {
    const { instanceName } = await readSettings(adminApi);

    await updateSettings(adminApi, { instanceName: "E2E Test Instance" });
    try {
      expect((await readSettings(adminApi)).instanceName).toBe("E2E Test Instance");
      expect((await siteStatus(anonApi)).instanceName).toBe("E2E Test Instance");
    } finally {
      await updateSettings(adminApi, { instanceName });
    }
  });

  test("closing registration blocks signups until it reopens", async ({ adminApi, anonApi }) => {
    await updateSettings(adminApi, { registrationOpen: false });
    try {
      expect((await register(anonApi, "blocked")).status()).toBe(403);
    } finally {
      await updateSettings(adminApi, { registrationOpen: true });
    }

    expect((await register(anonApi, "allowed")).status()).toBe(201);
  });
});

test.describe("Maintenance Mode", () => {
  test("regular users see the maintenance page while admins keep working", async ({
    adminApi,
    anonApi,
    page,
    openAs,
  }) => {
    await updateSettings(adminApi, { maintenanceMode: true });
    try {
      expect((await siteStatus(anonApi)).maintenanceMode).toBe(true);

      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Under Maintenance" })).toBeVisible();

      const adminPage = await openAs(await adminApi.storageState());
      await adminPage.goto("/dashboard");
      await expect(
        adminPage.getByPlaceholder("Search diagrams, folders, or contributors..."),
      ).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: "Under Maintenance" })).toHaveCount(0);
    } finally {
      await updateSettings(adminApi, { maintenanceMode: false });
    }

    expect((await siteStatus(anonApi)).maintenanceMode).toBe(false);
  });
});

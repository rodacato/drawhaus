import { test, expect } from "@playwright/test";
import { loginAsUser, unauthenticatedContext, ADMIN_USER } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Admin Settings", () => {
  test.describe.configure({ mode: "serial" });

  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;

  test.beforeAll(async () => {
    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
  });

  test.afterAll(async () => {
    // Always ensure registration is open after tests
    await adminCtx.patch("/api/admin/settings", {
      data: { registrationOpen: true },
    });
    await adminCtx?.dispose();
  });

  test("can get admin settings", async () => {
    const res = await adminCtx.get("/api/admin/settings");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const settings = body.settings ?? body;
    expect(settings).toBeTruthy();
  });

  test("can update instance name", async () => {
    const res = await adminCtx.patch("/api/admin/settings", {
      data: { instanceName: "E2E Test Instance" },
    });
    expect(res.ok()).toBeTruthy();

    // Verify
    const getRes = await adminCtx.get("/api/admin/settings");
    const settings = (await getRes.json()).settings ?? await getRes.json();
    expect(settings.instanceName ?? settings.instance_name).toBe("E2E Test Instance");

    // Restore
    await adminCtx.patch("/api/admin/settings", {
      data: { instanceName: "Drawhaus" },
    });
  });

  test("can toggle registration closed", async () => {
    const res = await adminCtx.patch("/api/admin/settings", {
      data: { registrationOpen: false },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("registration closed blocks new signups", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.post("/api/auth/register", {
      data: {
        name: "Blocked User",
        email: "blocked@test.com",
        password: "Test1234!pass",
      },
    });
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("can re-open registration", async () => {
    const res = await adminCtx.patch("/api/admin/settings", {
      data: { registrationOpen: true },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Maintenance Mode", () => {
  test.describe.configure({ mode: "serial" });

  let adminCtx2: Awaited<ReturnType<typeof loginAsUser>>;
  let userCtx: Awaited<ReturnType<typeof loginAsUser>>;

  test.beforeAll(async () => {
    adminCtx2 = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
    const { REGULAR_USER } = await import("../../fixtures/multi-user.fixture");
    userCtx = await loginAsUser(BASE_URL, REGULAR_USER.email, REGULAR_USER.password);
  });

  test.afterAll(async () => {
    // Always ensure maintenance mode is off
    await adminCtx2.patch("/api/admin/settings", {
      data: { maintenanceMode: false },
    });
    await adminCtx2?.dispose();
    await userCtx?.dispose();
  });

  test("can toggle maintenance mode on", async () => {
    const res = await adminCtx2.patch("/api/admin/settings", {
      data: { maintenanceMode: true },
    });
    expect(res.ok()).toBeTruthy();

    // Verify setting persisted
    const getRes = await adminCtx2.get("/api/admin/settings");
    const settings = (await getRes.json()).settings ?? await getRes.json();
    expect(settings.maintenanceMode ?? settings.maintenance_mode).toBe(true);
  });

  test("non-admin sees maintenance status", async () => {
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get("/api/site/status");
    if (res.ok()) {
      const body = await res.json();
      expect(body.maintenanceMode ?? body.maintenance_mode ?? body.maintenance).toBe(true);
    }
    expect(res.status()).toBeLessThan(500);
    await noAuth.dispose();
  });

  test("admin retains access during maintenance", async () => {
    const res = await adminCtx2.get("/api/admin/settings");
    expect(res.ok()).toBeTruthy();
  });

  test("can toggle maintenance mode off", async () => {
    const res = await adminCtx2.patch("/api/admin/settings", {
      data: { maintenanceMode: false },
    });
    expect(res.ok()).toBeTruthy();

    const getRes = await adminCtx2.get("/api/admin/settings");
    const settings = (await getRes.json()).settings ?? await getRes.json();
    expect(settings.maintenanceMode ?? settings.maintenance_mode).toBe(false);
  });
});

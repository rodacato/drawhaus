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

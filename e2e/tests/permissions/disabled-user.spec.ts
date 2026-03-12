import { test, expect } from "@playwright/test";
import { loginAsUser, ADMIN_USER, unauthenticatedContext } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Disabled User", () => {
  test.describe.configure({ mode: "serial" });

  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let tempUserId: string;
  const tempUser = {
    name: "Disabled Test User",
    email: `disabled_${Date.now()}@test.com`,
    password: "Test1234!pass",
  };

  test.beforeAll(async () => {
    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);

    // Register a temporary user
    const noAuth = await unauthenticatedContext(BASE_URL);
    const regRes = await noAuth.post("/api/auth/register", {
      data: tempUser,
    });
    if (regRes.ok() || regRes.status() === 201) {
      const body = await regRes.json();
      tempUserId = body.user?.id ?? body.id;
    }
    await noAuth.dispose();

    // If we didn't get the ID from register, find it via admin
    if (!tempUserId) {
      const usersRes = await adminCtx.get("/api/admin/users");
      if (usersRes.ok()) {
        const body = await usersRes.json();
        const users = body.users ?? body;
        const found = users.find((u: any) => u.email === tempUser.email);
        tempUserId = found?.id;
      }
    }
  });

  test.afterAll(async () => {
    // Re-enable and clean up
    if (tempUserId) {
      await adminCtx.patch(`/api/admin/users/${tempUserId}`, {
        data: { disabled: false },
      }).catch(() => {});
      await adminCtx.delete(`/api/admin/users/${tempUserId}`).catch(() => {});
    }
    await adminCtx?.dispose();
  });

  test("admin can disable a user", async () => {
    test.skip(!tempUserId, "Temp user not created");
    const res = await adminCtx.patch(`/api/admin/users/${tempUserId}`, {
      data: { disabled: true },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("disabled user cannot login", async () => {
    test.skip(!tempUserId, "Temp user not created");
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.post("/api/auth/login", {
      data: { email: tempUser.email, password: tempUser.password },
    });
    expect(res.ok()).toBeFalsy();
    expect([401, 403].includes(res.status())).toBeTruthy();
    await noAuth.dispose();
  });

  test("disabled user session is rejected", async () => {
    test.skip(!tempUserId, "Temp user not created");

    // Re-enable, login, then disable again to test active session rejection
    await adminCtx.patch(`/api/admin/users/${tempUserId}`, {
      data: { disabled: false },
    });

    // Login as temp user
    const userCtx = await loginAsUser(BASE_URL, tempUser.email, tempUser.password);

    // Verify session works
    const meRes = await userCtx.get("/api/auth/me");
    expect(meRes.ok()).toBeTruthy();

    // Admin disables the user
    await adminCtx.patch(`/api/admin/users/${tempUserId}`, {
      data: { disabled: true },
    });

    // User's session should now be rejected
    const blockedRes = await userCtx.get("/api/diagrams");
    expect(blockedRes.ok()).toBeFalsy();
    expect([401, 403].includes(blockedRes.status())).toBeTruthy();

    await userCtx.dispose();
  });

  test("admin can re-enable a user", async () => {
    test.skip(!tempUserId, "Temp user not created");
    const res = await adminCtx.patch(`/api/admin/users/${tempUserId}`, {
      data: { disabled: false },
    });
    expect(res.ok()).toBeTruthy();

    // User can login again
    const noAuth = await unauthenticatedContext(BASE_URL);
    const loginRes = await noAuth.post("/api/auth/login", {
      data: { email: tempUser.email, password: tempUser.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    await noAuth.dispose();
  });
});

import { test, expect } from "@playwright/test";
import { loginAsUser, REGULAR_USER, ADMIN_USER } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Role Boundaries", () => {
  let userCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;

  test.beforeAll(async () => {
    userCtx = await loginAsUser(BASE_URL, REGULAR_USER.email, REGULAR_USER.password);
    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
  });

  test.afterAll(async () => {
    await userCtx.dispose();
    await adminCtx.dispose();
  });

  // Admin route protection
  test("non-admin cannot GET /api/admin/users", async () => {
    const res = await userCtx.get("/api/admin/users");
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot PATCH /api/admin/settings", async () => {
    const res = await userCtx.patch("/api/admin/settings", {
      data: { registrationOpen: false },
    });
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot GET /api/admin/metrics", async () => {
    const res = await userCtx.get("/api/admin/metrics");
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot POST /api/admin/invite", async () => {
    const res = await userCtx.post("/api/admin/invite", {
      data: { email: "attacker@test.com" },
    });
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot GET /api/admin/invitations", async () => {
    const res = await userCtx.get("/api/admin/invitations");
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot delete users", async () => {
    const res = await userCtx.delete("/api/admin/users/some-fake-id");
    expect(res.status()).toBe(403);
  });

  // Admin CAN access admin routes (positive check)
  test("admin can GET /api/admin/users", async () => {
    const res = await adminCtx.get("/api/admin/users");
    expect(res.ok()).toBeTruthy();
  });

  test("admin can GET /api/admin/metrics", async () => {
    const res = await adminCtx.get("/api/admin/metrics");
    expect(res.ok()).toBeTruthy();
  });

  test("admin can GET /api/admin/settings", async () => {
    const res = await adminCtx.get("/api/admin/settings");
    expect(res.ok()).toBeTruthy();
  });

  test("admin can GET /api/admin/invitations", async () => {
    const res = await adminCtx.get("/api/admin/invitations");
    expect(res.ok()).toBeTruthy();
  });
});

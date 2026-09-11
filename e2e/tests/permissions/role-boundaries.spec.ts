import { test, expect } from "../../fixtures/test";

test.describe("Role Boundaries", () => {
  test("non-admin cannot GET /api/admin/users", async ({ request }) => {
    expect((await request.get("/api/admin/users")).status()).toBe(403);
  });

  test("non-admin cannot PATCH /api/admin/settings", async ({ request, adminApi }) => {
    const res = await request.patch("/api/admin/settings", {
      data: { registrationOpen: false },
    });

    expect(res.status()).toBe(403);
    const { settings } = await (await adminApi.get("/api/admin/settings")).json();
    expect(settings.registrationOpen).toBe(true);
  });

  test("non-admin cannot GET /api/admin/metrics", async ({ request }) => {
    expect((await request.get("/api/admin/metrics")).status()).toBe(403);
  });

  test("non-admin cannot POST /api/admin/invite", async ({ request }) => {
    const res = await request.post("/api/admin/invite", {
      data: { email: "attacker@test.com" },
    });
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot GET /api/admin/invitations", async ({ request }) => {
    expect((await request.get("/api/admin/invitations")).status()).toBe(403);
  });

  test("non-admin cannot delete users", async ({ request }) => {
    expect((await request.delete("/api/admin/users/some-fake-id")).status()).toBe(403);
  });

  test("admin can GET /api/admin/users", async ({ adminApi }) => {
    expect((await adminApi.get("/api/admin/users")).ok()).toBeTruthy();
  });

  test("admin can GET /api/admin/metrics", async ({ adminApi }) => {
    expect((await adminApi.get("/api/admin/metrics")).ok()).toBeTruthy();
  });

  test("admin can GET /api/admin/settings", async ({ adminApi }) => {
    expect((await adminApi.get("/api/admin/settings")).ok()).toBeTruthy();
  });

  test("admin can GET /api/admin/invitations", async ({ adminApi }) => {
    expect((await adminApi.get("/api/admin/invitations")).ok()).toBeTruthy();
  });
});

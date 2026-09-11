import { test, expect, uniqueEmail } from "../../fixtures/test";
import { createUserInvite } from "../../fixtures/api";

test.describe("Admin Invitations", () => {
  test("an invitation is listed as pending", async ({ adminApi }) => {
    const email = uniqueEmail("invite");
    await createUserInvite(adminApi, email);

    const res = await adminApi.get("/api/admin/invitations");
    expect(res.ok()).toBeTruthy();
    const { invitations } = (await res.json()) as { invitations: { email: string }[] };
    expect(invitations.map((i) => i.email)).toContain(email);
  });

  test("an invitation token resolves to the invited email", async ({ adminApi, anonApi }) => {
    const email = uniqueEmail("token");
    const token = await createUserInvite(adminApi, email);

    const res = await anonApi.get(`/api/auth/invite/${token}`);
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).email).toBe(email);
  });

  test("duplicate invite does not crash the server", async ({ adminApi }) => {
    const email = uniqueEmail("dup");
    await createUserInvite(adminApi, email);

    const res = await adminApi.post("/api/admin/invite", { data: { email } });
    expect(res.status()).toBeLessThan(500);
  });
});

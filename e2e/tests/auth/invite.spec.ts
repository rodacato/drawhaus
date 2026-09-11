import { test, expect, loginApi, uniqueEmail, SIGNED_OUT } from "../../fixtures/test";
import { createUserInvite } from "../../fixtures/api";

const PASSWORD = "Invited1234!pass";

test.describe("User Invitations", () => {
  test("GET /api/auth/invite/:token rejects an unknown token", async ({ anonApi }) => {
    const res = await anonApi.get("/api/auth/invite/invalid-token-xyz");
    expect(res.ok()).toBeFalsy();
  });

  test("accepting an invitation creates an account that can log in", async ({
    adminApi,
    anonApi,
  }) => {
    const email = uniqueEmail("invited");
    const token = await createUserInvite(adminApi, email);

    const res = await anonApi.post("/api/auth/accept-invite", {
      data: { token, name: "Invited User", password: PASSWORD },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).user.email).toBe(email);
    const session = await loginApi(email, PASSWORD);
    await session.dispose();
  });

  test("an invitation cannot be accepted twice", async ({ adminApi, anonApi }) => {
    const token = await createUserInvite(adminApi, uniqueEmail("once"));
    const data = { token, name: "Invited Once", password: PASSWORD };
    expect((await anonApi.post("/api/auth/accept-invite", { data })).status()).toBe(201);

    const again = await anonApi.post("/api/auth/accept-invite", { data });

    expect(again.ok()).toBeFalsy();
  });

  test("POST /api/auth/accept-invite rejects an unknown token", async ({ anonApi }) => {
    const res = await anonApi.post("/api/auth/accept-invite", {
      data: { token: "bad-token-xyz", name: "Fake User", password: PASSWORD },
    });
    expect(res.ok()).toBeFalsy();
  });

  test("UI: /register?invite=:token shows the invited email", async ({ adminApi, openAs }) => {
    const email = uniqueEmail("invite-ui");
    const token = await createUserInvite(adminApi, email);

    const page = await openAs(SIGNED_OUT);
    await page.goto(`/register?invite=${token}`);

    await expect(page.getByText(`You've been invited to join as ${email}`)).toBeVisible();
  });
});

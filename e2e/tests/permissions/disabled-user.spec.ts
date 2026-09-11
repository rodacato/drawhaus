import type { APIRequestContext } from "@playwright/test";
import { test, expect, newApiContext } from "../../fixtures/test";

async function setDisabled(adminApi: APIRequestContext, userId: string, disabled: boolean) {
  const res = await adminApi.patch(`/api/admin/users/${userId}`, { data: { disabled } });
  expect(res.ok(), `set disabled=${disabled}`).toBeTruthy();
}

async function loginStatus(email: string, password: string) {
  const api = await newApiContext();
  const res = await api.post("/api/auth/login", { data: { email, password } });
  await api.dispose();
  return res.status();
}

test.describe("Disabled User", () => {
  test("a disabled user cannot log in", async ({ adminApi, createUser }) => {
    const user = await createUser("disabled");

    await setDisabled(adminApi, user.id, true);

    expect([401, 403]).toContain(await loginStatus(user.email, user.password));
  });

  test("disabling a user rejects their existing session", async ({ adminApi, createUser }) => {
    const user = await createUser("disabled");
    expect((await user.api.get("/api/diagrams")).ok()).toBeTruthy();

    await setDisabled(adminApi, user.id, true);

    expect([401, 403]).toContain((await user.api.get("/api/diagrams")).status());
  });

  test("a re-enabled user can log in again", async ({ adminApi, createUser }) => {
    const user = await createUser("reenabled");
    await setDisabled(adminApi, user.id, true);

    await setDisabled(adminApi, user.id, false);

    expect(await loginStatus(user.email, user.password)).toBe(200);
  });
});

import { test, expect, newApiContext } from "../../fixtures/test";

async function loginStatus(email: string, password: string) {
  const api = await newApiContext();
  const res = await api.post("/api/auth/login", { data: { email, password } });
  await api.dispose();
  return res.status();
}

test.describe("User Security Settings", () => {
  test("after a password change only the new password works", async ({ createUser }) => {
    const user = await createUser("security");

    const res = await user.api.post("/api/auth/change-password", {
      data: { currentPassword: user.password, newPassword: "Changed1234!pass" },
    });
    expect(res.ok()).toBeTruthy();

    expect(await loginStatus(user.email, "Changed1234!pass")).toBe(200);
    expect(await loginStatus(user.email, user.password)).toBe(401);
  });

  test("a wrong current password leaves the password unchanged", async ({ createUser }) => {
    const user = await createUser("security");

    const res = await user.api.post("/api/auth/change-password", {
      data: { currentPassword: "WrongPassword123!", newPassword: "NewPassword123!" },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    expect(await loginStatus(user.email, user.password)).toBe(200);
  });

  test("deleting the account with a wrong password keeps it", async ({ createUser }) => {
    const user = await createUser("security");

    const res = await user.api.delete("/api/auth/account", {
      data: { password: "WrongPassword123!" },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    expect(await loginStatus(user.email, user.password)).toBe(200);
  });

  test("deleting the account with the right password removes it", async ({ createUser }) => {
    const user = await createUser("security");

    const res = await user.api.delete("/api/auth/account", {
      data: { password: user.password },
    });

    expect(res.ok()).toBeTruthy();
    expect(await loginStatus(user.email, user.password)).toBe(401);
  });
});

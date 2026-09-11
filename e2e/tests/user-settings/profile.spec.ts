import type { APIRequestContext } from "@playwright/test";
import { test, expect, PRIMARY_USER } from "../../fixtures/test";

async function currentName(api: APIRequestContext) {
  const res = await api.get("/api/auth/me");
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { user: { name: string } }).user.name;
}

test.describe("User Profile Settings", () => {
  test("GET /api/auth/me returns the signed-in user", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.email).toBe(PRIMARY_USER.email);
    expect(user.name).toBeTruthy();
  });

  test("renaming through the API persists", async ({ createUser }) => {
    const user = await createUser("profile");

    const res = await user.api.patch("/api/auth/me", { data: { name: "E2E Updated Name" } });
    expect(res.ok()).toBeTruthy();

    expect(await currentName(user.api)).toBe("E2E Updated Name");
  });

  test("an empty name is rejected and the old one kept", async ({ createUser }) => {
    const user = await createUser("profile");

    const res = await user.api.patch("/api/auth/me", { data: { name: "" } });

    expect(res.ok()).toBeFalsy();
    expect(await currentName(user.api)).toBe(user.name);
  });

  test("the profile form saves a new name", async ({ createUser, openAs }) => {
    const user = await createUser("profile");
    const page = await openAs(user.storageState);
    await page.goto("/settings?tab=profile");

    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toHaveValue(user.name);
    await nameInput.fill("UI Updated Name");
    await page.getByRole("button", { name: /save profile/i }).click();

    await expect(page.getByText("Profile updated")).toBeVisible();
    expect(await currentName(user.api)).toBe("UI Updated Name");
  });
});

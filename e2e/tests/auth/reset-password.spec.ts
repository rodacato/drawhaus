import { test, expect, SIGNED_OUT } from "../../fixtures/test";

test.describe("Reset Password", () => {
  test("validating an unknown token reports it invalid", async ({ anonApi }) => {
    const res = await anonApi.get("/api/auth/reset-password/invalid-token-xyz");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).valid).toBe(false);
  });

  test("resetting with an unknown token is rejected", async ({ anonApi }) => {
    const res = await anonApi.post("/api/auth/reset-password", {
      data: { token: "invalid-token-xyz", newPassword: "NewPass1234!" },
    });
    expect(res.ok()).toBeFalsy();
  });

  test("the reset page tells the visitor the link is invalid", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/reset-password/expired-fake-token");

    await expect(page.getByText("This reset link is invalid or has expired.")).toBeVisible();
  });
});

import type { Page } from "@playwright/test";
import { test, expect, SIGNED_OUT } from "../fixtures/test";

test.use({ storageState: SIGNED_OUT });

async function landingPath(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  return new URL(page.url()).pathname;
}

test.describe("Public pages", () => {
  for (const path of ["/", "/login", "/register"]) {
    test(`${path} stays reachable for a signed-out visitor`, async ({ page }) => {
      expect(await landingPath(page, path)).toBe(path);
    });
  }

  test("every other public page stays reachable for a signed-out visitor", async ({ page }) => {
    for (const path of [
      "/forgot-password",
      "/reset-password/some-token",
      "/workspace-invite/some-token",
      "/privacy",
      "/terms",
      "/self-host",
    ]) {
      expect(await landingPath(page, path), path).toBe(path);
    }
  });
});

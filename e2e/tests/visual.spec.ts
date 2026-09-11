import { test, expect, SIGNED_OUT } from "../fixtures/test";
import { createDiagram, createShareLink } from "../fixtures/api";

/**
 * Visual regression tests: each page is compared with its committed baseline.
 * To update baselines after an intentional UI change:
 *   npm run test:update-snapshots --workspace=e2e
 */

async function stabilizePage(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      /* Hide decorative blur blobs that cause sub-pixel instability */
      [class*="blur"] {
        display: none !important;
      }
      /* Force static rendering for gradients */
      [class*="gradient"] {
        background: #f5f5f5 !important;
      }
    `,
  });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.waitForTimeout(1000);
}

test.describe("Visual Regression", () => {
  test.setTimeout(120_000);
  test("login page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("login.png", { maxDiffPixelRatio: 0.05 });
  });

  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    await page.addStyleTag({
      content: `
        time { visibility: hidden !important; }
        img[src*="avatar"] { visibility: hidden !important; }
      `,
    });

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("dashboard.png", { maxDiffPixelRatio: 0.05 });
  });

  test("share join page", async ({ createUser, openAs }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Visual Share Test" });
    const token = await createShareLink(owner.api, diagram.id, "viewer");

    const guestPage = await openAs(SIGNED_OUT);
    await guestPage.goto(`/share/${token}`);
    await guestPage.waitForLoadState("networkidle");
    await stabilizePage(guestPage);

    const screenshot = await guestPage.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("share-join.png", { maxDiffPixelRatio: 0.05 });
  });

  test("register page", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("register.png", { maxDiffPixelRatio: 0.05 });
  });

  test("forgot password page", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    // At 5% tolerance the login page matches this baseline, so pin the page before comparing.
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible({
      timeout: 10_000,
    });
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("forgot-password.png", { maxDiffPixelRatio: 0.05 });
  });

  test("settings page - profile tab", async ({ page }) => {
    await page.goto("/settings?tab=profile");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    await page.addStyleTag({
      content: `
        img[src*="avatar"] { visibility: hidden !important; }
        input { color: transparent !important; }
      `,
    });

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("settings-profile.png", { maxDiffPixelRatio: 0.05 });
  });

  test("settings page - security tab", async ({ page }) => {
    await page.goto("/settings?tab=security");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("settings-security.png", { maxDiffPixelRatio: 0.05 });
  });

  test("admin panel - users", async ({ page }) => {
    await page.goto("/settings?tab=admin-users");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    await page.addStyleTag({
      content: `
        time { visibility: hidden !important; }
        td, span { color: transparent !important; }
        [data-testid*="date"], [data-testid*="time"] { visibility: hidden !important; }
      `,
    });

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("admin-users.png", { maxDiffPixelRatio: 0.05 });
  });

  test("landing page", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("landing.png", { maxDiffPixelRatio: 0.05 });
  });

  test("404 page", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);
    await page.goto("/this-page-does-not-exist");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("404.png", { maxDiffPixelRatio: 0.05 });
  });
});

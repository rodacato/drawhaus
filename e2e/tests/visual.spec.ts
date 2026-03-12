import { test, expect } from "@playwright/test";

/**
 * Visual regression tests.
 *
 * First run generates baseline screenshots.
 * Subsequent runs compare against baselines pixel by pixel.
 *
 * To update baselines after intentional UI changes:
 *   npm run test:update-snapshots --workspace=e2e
 */

/** Disable all animations/transitions and hide decorative blurs so screenshots are stable */
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
  // Blur any focused element to avoid cursor flicker
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
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    // Mask dynamic content by hiding it
    await page.addStyleTag({
      content: `
        time { visibility: hidden !important; }
        img[src*="avatar"] { visibility: hidden !important; }
      `,
    });

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("dashboard.png", { maxDiffPixelRatio: 0.05 });
  });

  test("share join page", async ({ browser }) => {
    const authContext = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const authPage = await authContext.newPage();

    const createRes = await authPage.request.post("/api/diagrams", {
      data: { title: "Visual Share Test" },
    });

    if (!createRes.ok()) {
      await authContext.close();
      test.skip(true, "Could not create test diagram");
      return;
    }

    const createBody = await createRes.json();
    const diagramId = createBody.diagram?.id ?? createBody.id;

    const shareRes = await authPage.request.post(`/api/share/${diagramId}`, {
      data: { role: "viewer" },
    });

    if (!shareRes.ok()) {
      await authContext.close();
      test.skip(true, "Could not create share link");
      return;
    }

    const shareBody = await shareRes.json();
    const token = shareBody.shareLink?.token ?? shareBody.token;
    await authContext.close();

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`/share/${token}`);
    await guestPage.waitForLoadState("networkidle");
    await stabilizePage(guestPage);

    const screenshot = await guestPage.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("share-join.png", { maxDiffPixelRatio: 0.05 });

    await guestContext.close();
  });

  test("register page", async ({ browser }) => {
    // Use unauthenticated context to avoid redirect
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/register");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("register.png", { maxDiffPixelRatio: 0.05 });
    await ctx.close();
  });

  test("forgot password page", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    try {
      await page.goto("http://localhost:5173/forgot-password");
      await page.waitForLoadState("networkidle");
      // Wait for the form to be visible before stabilizing
      await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
      await stabilizePage(page);

      const screenshot = await page.screenshot({ timeout: 60_000 });
      expect(screenshot).toMatchSnapshot("forgot-password.png", { maxDiffPixelRatio: 0.05 });
    } finally {
      await ctx.close();
    }
  });

  test("settings page - profile tab", async ({ page }) => {
    await page.goto("/settings?tab=profile");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    // Mask dynamic content (input values, avatars)
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
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    // Mask dynamic user data (dates, emails, user counts)
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

  test("landing page", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("landing.png", { maxDiffPixelRatio: 0.05 });
    await ctx.close();
  });

  test("404 page", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/this-page-does-not-exist");
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);

    const screenshot = await page.screenshot({ timeout: 60_000 });
    expect(screenshot).toMatchSnapshot("404.png", { maxDiffPixelRatio: 0.05 });
    await ctx.close();
  });
});

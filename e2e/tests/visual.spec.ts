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
    expect(screenshot).toMatchSnapshot("login.png", { maxDiffPixelRatio: 0.02 });
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
    expect(screenshot).toMatchSnapshot("dashboard.png", { maxDiffPixelRatio: 0.02 });
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
    expect(screenshot).toMatchSnapshot("share-join.png", { maxDiffPixelRatio: 0.02 });

    await guestContext.close();
  });
});

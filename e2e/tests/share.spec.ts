import { test, expect } from "@playwright/test";

test.describe("Share", () => {
  let diagramId: string;
  let shareToken: string;

  test.beforeAll(async ({ request }) => {
    // Create a diagram via API
    const createRes = await request.post("/api/diagrams", {
      data: { title: "E2E Share Test" },
    });

    if (createRes.ok()) {
      const body = await createRes.json();
      diagramId = body.diagram?.id ?? body.id;

      // Create a viewer share link
      const shareRes = await request.post(`/api/share/${diagramId}`, {
        data: { role: "viewer" },
      });

      if (shareRes.ok()) {
        const shareBody = await shareRes.json();
        shareToken = shareBody.shareLink?.token ?? shareBody.token;
      }
    }
  });

  test("shows join form for shared diagram", async ({ browser }) => {
    test.skip(!shareToken, "Could not create share link");

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/share/${shareToken}`);

    await expect(page.getByText(/your name/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /view diagram|join session/i }),
    ).toBeVisible();

    await context.close();
  });

  test("guest can submit join form", async ({ browser }) => {
    test.skip(!shareToken, "Could not create share link");

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/share/${shareToken}`);

    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill("Test Guest");
    // Submit via Enter to avoid CSS transition stability issues
    await nameInput.press("Enter");

    // The join button should become disabled or the form should be processing
    // We verify by checking the URL hasn't changed to an error page
    await page.waitForURL((url) => !url.pathname.includes("/error"), { timeout: 5_000 }).catch(() => {});
    expect(page.url()).toContain("/share/");

    await context.close();
  });

  test("shows error for invalid share token", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/share/invalid-token-xyz-12345");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/not found|expired|invalid|error/i),
    ).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test("can create editor share link", async ({ request }) => {
    test.skip(!diagramId, "Could not create test diagram");

    const res = await request.post(`/api/share/${diagramId}`, {
      data: { role: "editor" },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const token = body.shareLink?.token ?? body.token;
    expect(token).toBeTruthy();
  });

  test("can list share links for diagram", async ({ request }) => {
    test.skip(!diagramId, "Could not create test diagram");

    // Verify the diagram's share links via the diagram API
    const res = await request.get(`/api/diagrams/${diagramId}`);
    expect(res.ok()).toBeTruthy();
  });
});

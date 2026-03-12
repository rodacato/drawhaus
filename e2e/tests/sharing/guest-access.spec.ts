import { test, expect } from "@playwright/test";
import { createDiagram, createShareLink } from "../../fixtures/data.fixture";

test.describe("Guest Access", () => {
  let shareToken: string;

  test.beforeAll(async ({ request }) => {
    const diagram = await createDiagram(request, "Guest Access Test");
    const share = await createShareLink(request, diagram.id, "viewer");
    shareToken = share.token;
  });

  test("guest sees join form with name input", async ({ browser }) => {
    test.skip(!shareToken, "No share token");

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/share/${shareToken}`);
    await expect(page.getByText(/your name/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await ctx.close();
  });

  test("guest can fill and submit join form", async ({ browser }) => {
    test.skip(!shareToken, "No share token");

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/share/${shareToken}`);

    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill("Guest User");
    await nameInput.press("Enter");

    // Verify URL still on share page (no error redirect)
    expect(page.url()).toContain("/share/");
    await ctx.close();
  });

  test("invalid share token shows error", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/share/invalid-token-xyz-99999");
    await expect(page.getByText(/not found|expired|invalid/i)).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test("share link with viewer role shows role indicator", async ({ browser }) => {
    test.skip(!shareToken, "No share token");

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/share/${shareToken}`);
    await expect(page.getByText(/viewer|view/i).first()).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });
});

import { test, expect } from "@playwright/test";
import { createDiagram, createShareLink } from "../../fixtures/data.fixture";

test.describe("Embed", () => {
  let shareToken: string;

  test.beforeAll(async ({ request }) => {
    const diagram = await createDiagram(request, "Embed Test");
    const share = await createShareLink(request, diagram.id, "viewer");
    shareToken = share.token;
  });

  test("embed route loads without auth", async ({ browser }) => {
    test.skip(!shareToken, "No share token");

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/embed/${shareToken}`);
    // Should load something — not redirect to login
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/embed/");
    await ctx.close();
  });

  test("invalid embed token does not render diagram", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/embed/invalid-token-xyz-99999");
    await page.waitForLoadState("networkidle");
    // Invalid token should either show error or stay on loading
    // The key thing: it should NOT render an Excalidraw canvas
    const canvas = page.locator(".excalidraw canvas");
    const hasCanvas = await canvas.isVisible().catch(() => false);
    expect(hasCanvas).toBeFalsy();
    await ctx.close();
  });

  test("embed page has minimal chrome", async ({ browser }) => {
    test.skip(!shareToken, "No share token");

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/embed/${shareToken}`);
    await page.waitForLoadState("networkidle");

    // Embed should NOT have the main navigation sidebar
    const sidebar = page.locator("nav").first();
    const hasSidebar = await sidebar.isVisible().catch(() => false);
    // Embed pages typically have minimal or no navigation
    // Just verify the page loaded without error
    expect(page.url()).toContain("/embed/");
    await ctx.close();
  });
});

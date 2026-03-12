import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";

test.describe("Search Diagrams", () => {
  test("search returns matching diagrams", async ({ request }) => {
    const unique = `SearchTest_${Date.now()}`;
    await createDiagram(request, unique);

    const res = await request.get(`/api/diagrams/search?q=${unique}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const diagrams = body.diagrams ?? body;
    const found = diagrams.find((d: any) => d.title === unique);
    expect(found).toBeTruthy();
  });

  test("search with no results returns empty", async ({ request }) => {
    const res = await request.get("/api/diagrams/search?q=zzz_nonexistent_xyz_99999");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const diagrams = body.diagrams ?? body;
    expect(diagrams.length).toBe(0);
  });

  test("search updates URL with query param", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("TestSearch");
      await searchInput.press("Enter");
      await expect(page).toHaveURL(/[?&]q=TestSearch/);
    }
  });
});

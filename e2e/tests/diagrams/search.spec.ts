import { randomUUID } from "node:crypto";
import { test, expect } from "../../fixtures/test";
import { createDiagram } from "../../fixtures/api";

async function searchTitles(request: import("@playwright/test").APIRequestContext, q: string) {
  const res = await request.get(`/api/diagrams/search?q=${encodeURIComponent(q)}`);
  expect(res.ok()).toBeTruthy();
  const { diagrams } = (await res.json()) as { diagrams: { title: string }[] };
  return diagrams.map((d) => d.title);
}

test.describe("Search Diagrams", () => {
  test("search returns matching diagrams", async ({ request }) => {
    const title = `SearchTest_${randomUUID().slice(0, 8)}`;
    await createDiagram(request, { title });

    expect(await searchTitles(request, title)).toContain(title);
  });

  test("search with no results returns empty", async ({ request }) => {
    expect(await searchTitles(request, "zzz_nonexistent_xyz_99999")).toHaveLength(0);
  });

  test("searching from the dashboard puts the query in the URL", async ({ page }) => {
    await page.goto("/dashboard");

    const searchInput = page.getByPlaceholder("Search diagrams, folders, or contributors...");
    await searchInput.fill("TestSearch");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/[?&]q=TestSearch/);
  });
});

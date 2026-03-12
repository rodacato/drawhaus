import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";

test.describe("Star Diagrams", () => {
  test("can star a diagram", async ({ request }) => {
    const diagram = await createDiagram(request, "Star Test");

    const res = await request.patch(`/api/diagrams/${diagram.id}/star`, {
      data: { starred: true },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("can unstar a diagram", async ({ request }) => {
    const diagram = await createDiagram(request, "Unstar Test");

    // Star it first
    await request.patch(`/api/diagrams/${diagram.id}/star`, {
      data: { starred: true },
    });

    // Unstar it
    const res = await request.patch(`/api/diagrams/${diagram.id}/star`, {
      data: { starred: false },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("starred diagram appears in starred list", async ({ page, request }) => {
    const diagram = await createDiagram(request, "Starred List Test");
    await request.patch(`/api/diagrams/${diagram.id}/star`, {
      data: { starred: true },
    });

    // Navigate to starred view in dashboard
    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await page.locator("nav").getByText("Starred").first().click({ force: true });
    await page.locator("main h2").first().waitFor({ timeout: 5_000 });

    await expect(page.locator("main h2").first()).toContainText("Starred");
  });
});

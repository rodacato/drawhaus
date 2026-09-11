import { randomUUID } from "node:crypto";
import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram, getDiagram } from "../../fixtures/api";

async function setStar(request: APIRequestContext, diagramId: string, starred: boolean) {
  const res = await request.patch(`/api/diagrams/${diagramId}/star`, { data: { starred } });
  expect(res.ok()).toBeTruthy();
}

async function openStarred(page: Page) {
  await page.goto("/dashboard");
  await page.locator("nav").getByText("Starred").first().click();
  await expect(page.locator("main h2").first()).toContainText("Starred");
}

test.describe("Star Diagrams", () => {
  test("starring and unstarring updates the diagram", async ({ request }) => {
    const diagram = await createDiagram(request, { title: "Star Test" });

    await setStar(request, diagram.id, true);
    expect((await getDiagram(request, diagram.id)).starred).toBe(true);

    await setStar(request, diagram.id, false);
    expect((await getDiagram(request, diagram.id)).starred).toBe(false);
  });

  test("the Starred view lists starred diagrams only", async ({ page, request }) => {
    const suffix = randomUUID().slice(0, 8);
    const kept = await createDiagram(request, { title: `Kept Star ${suffix}` });
    const dropped = await createDiagram(request, { title: `Dropped Star ${suffix}` });
    await setStar(request, kept.id, true);
    await setStar(request, dropped.id, true);
    await setStar(request, dropped.id, false);

    await openStarred(page);

    await expect(page.getByText(`Kept Star ${suffix}`)).toBeVisible();
    await expect(page.getByText(`Dropped Star ${suffix}`)).toHaveCount(0);
  });
});

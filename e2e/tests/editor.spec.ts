import { test, expect } from "../fixtures/test";
import { createDiagram, getDiagram } from "../fixtures/api";

test.describe("Editor", () => {
  test("opens a board with its title and the canvas", async ({ page, request }) => {
    const diagram = await createDiagram(request, { title: "E2E Editor Test" });

    await page.goto(`/board/${diagram.id}`);

    await expect(page.locator(".excalidraw canvas").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTitle("Click to rename")).toHaveText("E2E Editor Test");
  });

  test("shows error for non-existent diagram", async ({ page }) => {
    await page.goto("/board/non-existent-id-12345");

    await expect(page.getByText("Diagram not found")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".excalidraw")).toHaveCount(0);
  });

  test("renaming the board from its title persists", async ({ page, request }) => {
    const diagram = await createDiagram(request, { title: "Before Rename" });
    await page.goto(`/board/${diagram.id}`);

    await page.getByTitle("Click to rename").click();
    const input = page.locator("input:focus");
    await input.fill("After Rename");
    await input.press("Enter");

    await expect(page.getByTitle("Click to rename")).toHaveText("After Rename");
    await expect
      .poll(async () => (await getDiagram(request, diagram.id)).title)
      .toBe("After Rename");
  });
});

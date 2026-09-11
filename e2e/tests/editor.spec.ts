import { BASE_URL, test, expect } from "../fixtures/test";
import { createDiagram, getDiagram, rectangle } from "../fixtures/api";

const EXCALIFONT = 5;

function excalifontText(id: string) {
  return {
    ...rectangle(id),
    type: "text",
    backgroundColor: "transparent",
    width: 60,
    height: 25,
    text: "Hello",
    originalText: "Hello",
    fontSize: 20,
    fontFamily: EXCALIFONT,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    autoResize: true,
    lineHeight: 1.25,
  };
}

test.describe("Editor", () => {
  test("opens a board with its title and the canvas", async ({ page, request }) => {
    const diagram = await createDiagram(request, { title: "E2E Editor Test" });

    await page.goto(`/board/${diagram.id}`);

    await expect(page.locator(".excalidraw canvas").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTitle("Click to rename")).toHaveText("E2E Editor Test");
  });

  test("loads the canvas fonts from the app's origin, never from esm.sh", async ({
    page,
    request,
  }) => {
    const diagram = await createDiagram(request, { elements: [excalifontText("font-probe")] });
    const requested: string[] = [];
    page.on("request", (req) => requested.push(req.url()));
    const localFont = page.waitForResponse((res) =>
      res.url().startsWith(`${BASE_URL}/excalidraw/fonts/Excalifont/`),
    );

    await page.goto(`/board/${diagram.id}`);
    await expect(page.locator(".excalidraw canvas").first()).toBeVisible({ timeout: 30_000 });

    expect((await localFont).status()).toBe(200);
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.fonts].some(
            (font) => font.family.replaceAll('"', "") === "Excalifont" && font.status === "loaded",
          ),
        ),
      )
      .toBe(true);
    await page.evaluate(() => document.fonts.ready);
    expect(requested.filter((url) => new URL(url).hostname === "esm.sh")).toEqual([]);
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

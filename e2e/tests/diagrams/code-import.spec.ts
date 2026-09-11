import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram, liveElementIds } from "../../fixtures/api";
import { BoardPage } from "../../pages/board.page";

async function openCodeImport(page: Page, request: APIRequestContext) {
  const diagram = await createDiagram(request, { title: "Code Import Test" });
  await page.goto(`/board/${diagram.id}`);
  await page.getByTitle("Import from Code").click();
  await expect(page.getByRole("heading", { name: "Import from Code" })).toBeVisible();
  return diagram;
}

async function importMermaid(page: Page, code: string) {
  const board = new BoardPage(page);
  await board.waitForCanvas();
  await board.waitForEditorRole();
  await page.getByRole("textbox").fill(code);
  await expect(page.getByText("Preview", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to Canvas" }).click();
  await expect(page.getByRole("heading", { name: "Import from Code" })).toBeHidden();
  return board;
}

async function sceneSummary(board: BoardPage) {
  return (await board.elements()).map((e) => `${e.type}:${e.text ?? ""}`);
}

test.describe("Code Import Panel", () => {
  test("offers both formats and waits for code before importing", async ({ page, request }) => {
    await openCodeImport(page, request);

    await expect(page.getByRole("button", { name: "Mermaid" })).toBeVisible();
    await expect(page.getByRole("button", { name: "PlantUML" })).toBeVisible();
    await expect(page.getByText("Replace existing elements")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Canvas" })).toBeDisabled();
  });

  test("valid Mermaid code shows a preview and enables the import", async ({ page, request }) => {
    await openCodeImport(page, request);

    await page.getByRole("textbox").fill("graph TD\n    A-->B");

    await expect(page.getByText("Preview", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Canvas" })).toBeEnabled();
  });

  test("invalid Mermaid code shows a syntax error and blocks the import", async ({
    page,
    request,
  }) => {
    await openCodeImport(page, request);

    await page.getByRole("textbox").fill("this is not valid mermaid at all }{}{");

    await expect(page.getByText("Syntax error", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Canvas" })).toBeDisabled();
    await expect(page.getByText("Preview", { exact: true })).toHaveCount(0);
  });

  test("Add to Canvas puts the Mermaid diagram on the board and it persists", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const diagram = await openCodeImport(page, request);

    const board = await importMermaid(page, "flowchart LR\n    A[Start] --> B[End]");

    await expect
      .poll(() => sceneSummary(board))
      .toEqual(expect.arrayContaining(["text:Start", "text:End"]));
    await board.waitUntilSaved();
    const imported = (await board.elementIds()).sort();

    await page.reload();
    await board.waitForCanvas();

    await expect.poll(async () => (await board.elementIds()).sort()).toEqual(imported);
    expect((await liveElementIds(request, diagram.id)).sort()).toEqual(imported);
  });

  test("Add to Canvas imports a flowchart whose arrows have no surrounding whitespace", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await openCodeImport(page, request);

    const board = await importMermaid(page, "graph TD\n    A-->B");

    await expect
      .poll(() => sceneSummary(board))
      .toEqual(expect.arrayContaining(["text:A", "text:B"]));
  });

  test("closes panel on Escape", async ({ page, request }) => {
    await openCodeImport(page, request);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("heading", { name: "Import from Code" })).toBeHidden();
  });
});

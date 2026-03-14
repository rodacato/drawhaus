import { test, expect } from "@playwright/test";

test.describe("Code Import Panel", () => {
  test.setTimeout(60_000);

  let diagramId: string;

  test.beforeEach(async ({ page }) => {
    const res = await page.request.post("/api/diagrams", {
      data: { title: "Code Import Test" },
    });
    if (res.ok()) {
      const body = await res.json();
      diagramId = body.diagram?.id ?? body.id;
    }
  });

  test("opens Code Import panel from sidebar", async ({ page }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000); // wait for Excalidraw to load

    // Click the "Import from Code" sidebar button
    const codeButton = page.getByTitle("Import from Code");
    await expect(codeButton).toBeVisible({ timeout: 10_000 });
    await codeButton.click();

    // Verify panel opened with expected UI elements
    await expect(page.getByRole("heading", { name: "Import from Code" })).toBeVisible();
    await expect(page.getByText("Mermaid")).toBeVisible();
    await expect(page.getByText("PlantUML")).toBeVisible();
    await expect(page.getByRole("textbox")).toBeVisible();
    await expect(page.getByText("Add to Canvas")).toBeVisible();
    await expect(page.getByText("Replace existing elements")).toBeVisible();
  });

  test("shows preview when valid Mermaid code is entered", async ({ page }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const codeButton = page.getByTitle("Import from Code");
    await expect(codeButton).toBeVisible({ timeout: 10_000 });
    await codeButton.click();

    // Enter valid Mermaid code
    const textarea = page.getByRole("textbox");
    await textarea.fill("graph TD\n    A-->B");

    // Wait for debounced preview (500ms + render time)
    await expect(page.getByText("Preview", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("shows error for invalid Mermaid code", async ({ page }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const codeButton = page.getByTitle("Import from Code");
    await expect(codeButton).toBeVisible({ timeout: 10_000 });
    await codeButton.click();

    // Enter invalid code
    const textarea = page.getByRole("textbox");
    await textarea.fill("this is not valid mermaid at all }{}{");

    // Wait for debounced error
    await page.waitForTimeout(1500);

    // The "Add to Canvas" button should be disabled when there's an error
    const addButton = page.getByText("Add to Canvas");
    await expect(addButton).toBeDisabled();
  });

  test("closes panel on Escape", async ({ page }) => {
    test.skip(!diagramId, "Could not create test diagram");

    await page.goto(`/board/${diagramId}`);
    await page.waitForTimeout(3000);

    const codeButton = page.getByTitle("Import from Code");
    await expect(codeButton).toBeVisible({ timeout: 10_000 });
    await codeButton.click();

    await expect(page.getByRole("heading", { name: "Import from Code" })).toBeVisible();

    await page.keyboard.press("Escape");

    // Panel should close — the heading disappears
    await expect(page.getByRole("heading", { name: "Import from Code" })).not.toBeVisible({ timeout: 3_000 });
  });
});

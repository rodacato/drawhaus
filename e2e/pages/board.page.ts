import { expect, type Locator, type Page } from "@playwright/test";
import { liveSceneElements, liveSceneIds } from "../support/scene";

export class BoardPage {
  readonly excalidraw: Locator;
  readonly viewMode: Locator;
  readonly interactiveCanvas: Locator;
  readonly saveBadge: Locator;
  readonly connectionBadge: Locator;

  constructor(readonly page: Page) {
    this.excalidraw = page.locator(".excalidraw");
    this.viewMode = page.locator(".excalidraw.excalidraw--view-mode");
    this.interactiveCanvas = page.locator("canvas.excalidraw__canvas.interactive");
    this.saveBadge = page.getByText(/^(Ready|Unsaved|Saving\.\.\.|Saved .+|Error)$/);
    this.connectionBadge = page.getByText(/^(Connecting|Reconnecting)\.\.\.$/);
  }

  async open(diagramId: string) {
    await this.page.goto(`/board/${diagramId}`);
    await this.waitForCanvas();
  }

  async waitForCanvas() {
    await expect(this.interactiveCanvas).toBeVisible({ timeout: 30_000 });
    await expect(this.connectionBadge).toHaveCount(0, { timeout: 15_000 });
  }

  // The save badge only renders once the room join has granted an editing role.
  async waitForEditorRole() {
    await expect(this.saveBadge).toBeVisible({ timeout: 15_000 });
  }

  async waitUntilSaved() {
    await expect(this.saveBadge).toHaveText(/^Saved /, { timeout: 15_000 });
  }

  // Cold loads start in view mode (fixme in collaboration/board.spec.ts); Alt+R is Excalidraw's
  // own toggle, so this keeps drawing tests meaningful until that bug is fixed.
  async ensureEditable() {
    if ((await this.viewMode.count()) > 0) {
      const box = await this.interactiveCanvas.boundingBox();
      if (!box) throw new Error("canvas is not laid out");
      await this.page.mouse.click(box.x + box.width - 120, box.y + box.height - 160);
      await this.page.keyboard.press("Alt+r");
    }
    await expect(this.viewMode).toHaveCount(0);
    await this.selectTool("selection");
  }

  async selectTool(tool: "selection" | "rectangle") {
    await this.page
      .locator("label.ToolIcon", { has: this.page.getByTestId(`toolbar-${tool}`) })
      .click();
  }

  async canvasPoint(x: number, y: number) {
    const box = await this.interactiveCanvas.boundingBox();
    if (!box) throw new Error("canvas is not laid out");
    return { x: box.x + x, y: box.y + y };
  }

  // The default spot stays clear of the shape-properties panel Excalidraw opens on the left.
  async drawRectangle(x = 450, y = 250, width = 160, height = 100) {
    await this.selectTool("rectangle");
    const start = await this.canvasPoint(x, y);
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + width, start.y + height, { steps: 8 });
    await this.page.mouse.up();
  }

  elements() {
    return liveSceneElements(this.page);
  }

  elementIds() {
    return liveSceneIds(this.page);
  }
}

import { type Page, type Locator } from "@playwright/test";

export class EditorPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator(".excalidraw canvas").first();
    this.loadingIndicator = page.getByText("Loading...");
    this.errorMessage = page.getByText("Diagram not found");
  }

  async waitForLoad() {
    await this.loadingIndicator.waitFor({ state: "hidden", timeout: 15_000 });
  }

  async waitForCanvas() {
    await this.canvas.waitFor({ state: "visible", timeout: 15_000 });
  }
}

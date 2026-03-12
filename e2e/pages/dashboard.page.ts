import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newDiagramButton: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("main h2").first();
    this.searchInput = page.locator('input[type="search"]');
    this.newDiagramButton = page.getByRole("button", {
      name: /new diagram/i,
    });
    this.loadingIndicator = page.getByText("Loading...");
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async waitForLoad() {
    await this.loadingIndicator.waitFor({ state: "hidden", timeout: 10_000 });
  }

  async searchDiagrams(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press("Enter");
  }

  /** Click on a diagram card by its title */
  async openDiagram(title: string) {
    await this.page.getByText(title).click();
  }

  /** Get the count of diagram cards visible */
  getDiagramCards() {
    return this.page.locator('[class*="diagram"]').or(this.page.locator("a[href^='/board/']"));
  }
}

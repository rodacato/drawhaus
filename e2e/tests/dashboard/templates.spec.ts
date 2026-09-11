import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createTemplate } from "../../fixtures/api";

async function openMyTemplates(page: Page) {
  await page.goto("/dashboard");
  await page.locator("nav").getByText("My Templates").first().click();
  await expect(page.locator("main h2").first()).toContainText("My Templates");
}

test.describe("Dashboard — My Templates", () => {
  test("lists a template the user created", async ({ createUser, openAs }) => {
    const user = await createUser("templates");
    await createTemplate(user.api, { title: "Dashboard E2E Template" });

    const page = await openAs(user.storageState);
    await openMyTemplates(page);

    await expect(page.getByText("Dashboard E2E Template")).toBeVisible();
  });

  test("shows the empty state for a user without templates", async ({ createUser, openAs }) => {
    const user = await createUser("no-templates");

    const page = await openAs(user.storageState);
    await openMyTemplates(page);

    await expect(page.getByText(/no custom templates/i)).toBeVisible();
  });
});

import type { Page } from "@playwright/test";
import { test, expect, SIGNED_OUT } from "../../fixtures/test";
import { createDiagram, createShareLink, rectangle } from "../../fixtures/api";

test.use({ storageState: SIGNED_OUT });

async function joinAs(page: Page, token: string, name: string) {
  await page.goto(`/share/${token}`);
  await page.locator('input[type="text"]').fill(name);
  await page.locator('input[type="text"]').press("Enter");
}

test.describe("Guest Access", () => {
  test("a viewer guest sees the diagram read-only", async ({ page, createUser }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, {
      title: "Guest Access Test",
      elements: [rectangle("guest-rect")],
    });
    const token = await createShareLink(owner.api, diagram.id, "viewer");

    await joinAs(page, token, "Guest User");

    await expect(page.getByText("Guest User (guest)")).toBeVisible();
    await expect(page.getByText("View only")).toBeVisible();
    await expect(page.locator(".excalidraw.excalidraw--view-mode")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("a returning guest skips the join form", async ({ page, createUser }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Returning Guest" });
    const token = await createShareLink(owner.api, diagram.id, "viewer");
    await joinAs(page, token, "Returning Guest");
    await expect(page.getByText("Returning Guest (guest)")).toBeVisible();

    await page.reload();

    await expect(page.getByText("Returning Guest (guest)")).toBeVisible();
    await expect(page.getByText(/your name/i)).toHaveCount(0);
  });
});

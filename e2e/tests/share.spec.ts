import { test, expect, SIGNED_OUT } from "../fixtures/test";
import { createDiagram, createShareLink } from "../fixtures/api";

test.use({ storageState: SIGNED_OUT });

test.describe("Share join form", () => {
  test("a viewer link offers to view the diagram", async ({ page, createUser }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Shared For Viewing" });
    const token = await createShareLink(owner.api, diagram.id, "viewer");

    await page.goto(`/share/${token}`);

    await expect(page.getByRole("heading", { name: "Shared For Viewing" })).toBeVisible();
    await expect(page.getByText("You've been invited to view this diagram.")).toBeVisible();
    await expect(page.getByRole("button", { name: /view diagram/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /join session/i })).toHaveCount(0);
  });

  test("an editor link invites the guest to collaborate", async ({ page, createUser }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Shared For Editing" });
    const token = await createShareLink(owner.api, diagram.id, "editor");

    await page.goto(`/share/${token}`);

    await expect(page.getByText("You've been invited to collaborate.")).toBeVisible();
    await expect(page.getByRole("button", { name: /join session/i })).toBeVisible();
    await expect(page.getByText("Viewing as editor")).toBeVisible();
  });

  test("shows error for invalid share token", async ({ page }) => {
    await page.goto("/share/invalid-token-xyz-12345");

    await expect(page.getByText("Share link not found or expired")).toBeVisible();
    await expect(page.getByText(/your name/i)).toHaveCount(0);
  });
});

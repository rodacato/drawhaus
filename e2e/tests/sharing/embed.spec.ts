import { test, expect, SIGNED_OUT } from "../../fixtures/test";
import { createDiagram, createShareLink, rectangle } from "../../fixtures/api";
import { liveSceneIds } from "../../support/scene";

test.use({ storageState: SIGNED_OUT });

test.describe("Embed", () => {
  test("renders the shared diagram read-only without the app chrome", async ({
    page,
    createUser,
  }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, {
      title: "Embed Test",
      elements: [rectangle("embed-rect")],
    });
    const token = await createShareLink(owner.api, diagram.id, "viewer");

    await page.goto(`/embed/${token}`);

    await expect(page.locator(".excalidraw.excalidraw--view-mode")).toBeVisible({
      timeout: 30_000,
    });
    await expect.poll(() => liveSceneIds(page)).toContain("embed-rect");
    await expect(page.locator("nav")).toHaveCount(0);
  });

  test("an invalid token never renders a canvas", async ({ page }) => {
    const resolved = page.waitForResponse((r) => r.url().includes("/api/share/link/invalid"));

    await page.goto("/embed/invalid-token-xyz-99999");

    expect((await resolved).status()).toBeGreaterThanOrEqual(400);
    await expect(page.locator(".excalidraw")).toHaveCount(0);
  });
});

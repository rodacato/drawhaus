import type { Page } from "@playwright/test";
import { test, expect, SIGNED_OUT } from "../../fixtures/test";
import { createDiagram, createShareLink, liveElementIds, rectangle } from "../../fixtures/api";
import { BoardPage } from "../../pages/board.page";
import { SocketTraffic } from "../../support/socket-traffic";
import { sharedBoard } from "../../support/team";

// Past the 1.2s save debounce, so a delayed save would already have been sent.
const SETTLE_MS = 2_000;

async function joinShare(page: Page, token: string, name: string) {
  await page.goto(`/share/${token}`);
  await page.locator('input[type="text"]').fill(name);
  await page.locator('input[type="text"]').press("Enter");
}

function recordDiagramWrites(page: Page, diagramId: string) {
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET" && req.url().includes(`/api/diagrams/${diagramId}`)) {
      writes.push(`${req.method()} ${req.url()}`);
    }
  });
  return writes;
}

async function pokeAround(board: BoardPage) {
  const onRect = await board.canvasPoint(180, 150);
  await board.page.mouse.click(onRect.x, onRect.y);
  await board.page.keyboard.press("Delete");
  await board.page.mouse.wheel(0, 200);
  await board.page.waitForTimeout(SETTLE_MS);
}

test.describe("Roles on the canvas", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a workspace viewer gets a read-only canvas and sends no edits", async ({
    createUser,
    openAs,
  }) => {
    const {
      owner,
      diagram,
      teammateBoard: viewer,
    } = await sharedBoard(
      { createUser, openAs },
      { title: "Viewer Board", elements: [rectangle("viewer-rect")], teammateRole: "viewer" },
    );
    const traffic = new SocketTraffic(viewer.page);
    const writes = recordDiagramWrites(viewer.page, diagram.id);
    await viewer.open(diagram.id);

    await expect(viewer.viewMode).toBeVisible();
    await expect.poll(() => viewer.elementIds()).toEqual(["viewer-rect"]);
    await pokeAround(viewer);

    expect(traffic.sentEdits()).toBe(0);
    expect(writes).toEqual([]);
    await expect(viewer.saveBadge).toHaveCount(0);
    expect(await liveElementIds(owner.api, diagram.id)).toEqual(["viewer-rect"]);
  });

  test("a viewer share-link guest gets a read-only canvas and sends no edits", async ({
    createUser,
    openAs,
  }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, {
      title: "Viewer Link",
      elements: [rectangle("viewer-rect")],
    });
    const token = await createShareLink(owner.api, diagram.id, "viewer");
    const guest = new BoardPage(await openAs(SIGNED_OUT));
    const traffic = new SocketTraffic(guest.page);
    const writes = recordDiagramWrites(guest.page, diagram.id);

    await joinShare(guest.page, token, "Reader");
    await guest.waitForCanvas();

    await expect(guest.viewMode).toBeVisible();
    await expect(guest.page.getByText("View only")).toBeVisible();
    await expect.poll(() => guest.elementIds()).toEqual(["viewer-rect"]);
    await pokeAround(guest);

    expect(traffic.sentEdits()).toBe(0);
    expect(writes).toEqual([]);
    expect(await liveElementIds(owner.api, diagram.id)).toEqual(["viewer-rect"]);
  });

  test("a guest editor joins in edit mode", async ({ createUser, openAs }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Guest Edit Mode" });
    const token = await createShareLink(owner.api, diagram.id, "editor");
    const guest = new BoardPage(await openAs(SIGNED_OUT));

    await joinShare(guest.page, token, "Guest Editor");
    await guest.waitForCanvas();
    await guest.waitForEditorRole();

    await expect(guest.viewMode).toHaveCount(0);
  });

  test("a guest editor's drawing reaches the owner", async ({ createUser, openAs }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Guest Draw" });
    const token = await createShareLink(owner.api, diagram.id, "editor");
    const ownerBoard = new BoardPage(await openAs(owner.storageState));
    await ownerBoard.open(diagram.id);
    const guest = new BoardPage(await openAs(SIGNED_OUT));

    await joinShare(guest.page, token, "Guest Editor");
    await guest.waitForCanvas();
    await guest.waitForEditorRole();
    await guest.ensureEditable();
    await guest.drawRectangle();
    await expect.poll(() => guest.elementIds()).toHaveLength(1);
    const [drawn] = await guest.elementIds();

    await expect.poll(() => ownerBoard.elementIds()).toEqual([drawn]);
    await expect.poll(() => liveElementIds(owner.api, diagram.id)).toEqual([drawn]);
  });
});

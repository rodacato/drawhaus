import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createSnapshot, liveElementIds, rectangle } from "../../fixtures/api";
import { BoardPage } from "../../pages/board.page";
import { viewport } from "../../support/scene";
import { hasEvent, SocketTraffic } from "../../support/socket-traffic";
import { sharedBoard } from "../../support/team";

// Past the 1.2s save debounce, so a delayed echo or save would already have been sent.
const SETTLE_MS = 2_000;

// Toasts disappear after 3s, so watch from before the action instead of checking afterwards.
function watchForText(page: Page, text: RegExp, timeout: number) {
  return page
    .getByText(text)
    .first()
    .waitFor({ state: "visible", timeout })
    .then(
      () => true,
      () => false,
    );
}

test.describe("Real-time collaboration", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a teammate sees a new rectangle without an echo or a conflict", async ({
    createUser,
    openAs,
  }) => {
    const { diagram, ownerBoard, teammateBoard } = await sharedBoard(
      { createUser, openAs },
      { title: "Live Draw" },
    );
    const ownerTraffic = new SocketTraffic(ownerBoard.page);
    const teammateTraffic = new SocketTraffic(teammateBoard.page);
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);
    await ownerBoard.waitForEditorRole();
    await teammateBoard.waitForEditorRole();
    await ownerBoard.ensureEditable();
    const conflictToast = watchForText(teammateBoard.page, /modificó/, 10_000);

    await ownerBoard.drawRectangle();
    await ownerBoard.waitUntilSaved();
    const drawn = (await ownerBoard.elements()).map((e) => `${e.id}@${e.version}`);

    await expect
      .poll(async () => (await teammateBoard.elements()).map((e) => `${e.id}@${e.version}`))
      .toEqual(drawn);
    expect(await conflictToast).toBe(false);
    await teammateBoard.page.waitForTimeout(SETTLE_MS);
    expect(teammateTraffic.sentEdits()).toBe(0);
    expect(ownerTraffic.receivedCount("scene-delta-received")).toBe(0);
    expect(ownerTraffic.receivedCount("scene-updated")).toBe(0);
  });

  test("a delete wins over a teammate's concurrent drag", async ({ createUser, openAs }) => {
    const { owner, diagram, ownerBoard, teammateBoard } = await sharedBoard(
      { createUser, openAs },
      { title: "Contested", elements: [rectangle("contested", 500, 250, 160, 100)] },
    );
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);
    await ownerBoard.waitForEditorRole();
    await teammateBoard.waitForEditorRole();
    await ownerBoard.ensureEditable();
    await teammateBoard.ensureEditable();

    const grab = await teammateBoard.canvasPoint(580, 300);
    await teammateBoard.page.mouse.move(grab.x, grab.y);
    await teammateBoard.page.mouse.down();
    await teammateBoard.page.mouse.move(grab.x + 40, grab.y + 30, { steps: 5 });

    // Delete it where the owner actually sees it: until the drag has reached them, a click on the
    // element's new place lands on empty canvas, selects nothing, and Delete does nothing.
    await expect.poll(async () => (await ownerBoard.elements())[0]?.x ?? 0).toBeGreaterThan(500);
    const [dragged] = await ownerBoard.elements();
    const target = await ownerBoard.canvasPoint(
      dragged.x + dragged.width / 2,
      dragged.y + dragged.height / 2,
    );
    await ownerBoard.page.mouse.click(target.x, target.y);
    await ownerBoard.page.keyboard.press("Delete");
    await expect.poll(() => ownerBoard.elementIds()).toEqual([]);

    await teammateBoard.page.mouse.move(grab.x + 80, grab.y + 60, { steps: 5 });
    await teammateBoard.page.mouse.up();
    await teammateBoard.page.waitForTimeout(SETTLE_MS);

    expect(await ownerBoard.elementIds()).toEqual([]);
    expect(await teammateBoard.elementIds()).toEqual([]);
    expect(await liveElementIds(owner.api, diagram.id)).toEqual([]);
  });

  type SharedBoard = Awaited<ReturnType<typeof sharedBoard>>;

  // Freezes "Before change" as a snapshot, then moves the board on, so a restore has to remove
  // something. Scenes are created on the first room join, and snapshots need one.
  async function snapshotThenChange(board: SharedBoard, opener: BoardPage) {
    await opener.open(board.diagram.id);
    await opener.page.close();
    await createSnapshot(board.owner.api, board.diagram.id, "Before change");
    const changed = await board.owner.api.patch(`/api/diagrams/${board.diagram.id}`, {
      data: { elements: [rectangle("after-rect", 400, 100)] },
    });
    expect(changed.ok()).toBeTruthy();
  }

  async function restoreBeforeChange(board: SharedBoard) {
    await board.ownerBoard.page.getByTitle("Version History").click();
    await board.ownerBoard.page.getByText("Before change").click();
    await board.ownerBoard.page.getByRole("button", { name: "Restore this version" }).click();
  }

  test("restoring a snapshot updates every open client", async ({ createUser, openAs }) => {
    const board = await sharedBoard(
      { createUser, openAs },
      { title: "Restore", elements: [rectangle("before-rect")] },
    );
    const { owner, diagram, ownerBoard, teammateBoard } = board;
    await snapshotThenChange(board, new BoardPage(await openAs(owner.storageState)));
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);
    await expect.poll(() => ownerBoard.elementIds()).toEqual(["after-rect"]);
    await expect.poll(() => teammateBoard.elementIds()).toEqual(["after-rect"]);

    await restoreBeforeChange(board);

    await expect.poll(() => ownerBoard.elementIds()).toEqual(["before-rect"]);
    await expect.poll(() => teammateBoard.elementIds()).toEqual(["before-rect"]);
    await expect.poll(() => liveElementIds(owner.api, diagram.id)).toEqual(["before-rect"]);
    // And it stays restored: no client re-saves the scene the restore replaced.
    await ownerBoard.page.waitForTimeout(SETTLE_MS);
    expect(await liveElementIds(owner.api, diagram.id)).toEqual(["before-rect"]);
    expect(await ownerBoard.elementIds()).toEqual(["before-rect"]);
    expect(await teammateBoard.elementIds()).toEqual(["before-rect"]);
  });

  test("a save computed before a restore does not bring back what it removed", async ({
    createUser,
    openAs,
  }) => {
    const board = await sharedBoard(
      { createUser, openAs },
      { title: "Restore Race", elements: [rectangle("before-rect")] },
    );
    const { owner, diagram, ownerBoard, teammateBoard } = board;
    let holdSaves = false;
    const held: (string | Buffer)[] = [];
    let release = (_message: string | Buffer) => {};
    await teammateBoard.page.routeWebSocket(/\/socket\.io\//, (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((message) => {
        if (holdSaves && hasEvent(message, "save-scene")) held.push(message);
        else server.send(message);
      });
      release = (message) => server.send(message);
    });
    await snapshotThenChange(board, new BoardPage(await openAs(owner.storageState)));
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);
    await expect.poll(() => teammateBoard.elementIds()).toEqual(["after-rect"]);
    await teammateBoard.waitForEditorRole();
    await teammateBoard.ensureEditable();

    // The teammate's save is computed now and only reaches the server after the restore.
    holdSaves = true;
    await teammateBoard.drawRectangle(700, 320);
    await expect.poll(() => held.length, { timeout: 15_000 }).toBeGreaterThan(0);

    await restoreBeforeChange(board);
    await expect.poll(() => ownerBoard.elementIds()).toEqual(["before-rect"]);
    await expect.poll(() => teammateBoard.elementIds()).toEqual(["before-rect"]);

    holdSaves = false;
    for (const message of held) release(message);
    await teammateBoard.page.waitForTimeout(SETTLE_MS);

    expect(await liveElementIds(owner.api, diagram.id)).toEqual(["before-rect"]);
    expect(await teammateBoard.elementIds()).toEqual(["before-rect"]);
    expect(await ownerBoard.elementIds()).toEqual(["before-rect"]);
  });

  test("undo does not revert a teammate's change", async ({ createUser, openAs }) => {
    const { owner, diagram, ownerBoard, teammateBoard } = await sharedBoard(
      { createUser, openAs },
      { title: "Undo" },
    );
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);
    await ownerBoard.waitForEditorRole();
    await teammateBoard.waitForEditorRole();
    await ownerBoard.ensureEditable();
    await teammateBoard.ensureEditable();

    await ownerBoard.drawRectangle(400, 200);
    await expect.poll(() => ownerBoard.elementIds()).toHaveLength(1);
    const [first] = await ownerBoard.elementIds();
    await teammateBoard.drawRectangle(750, 200);
    await expect.poll(() => ownerBoard.elementIds()).toHaveLength(2);
    const theirs = (await ownerBoard.elementIds()).find((id) => id !== first);
    // A local action after the remote one is what lets an uncaptured remote update join the undo step.
    await ownerBoard.drawRectangle(400, 420);
    await expect.poll(() => ownerBoard.elementIds()).toHaveLength(3);
    const second = (await ownerBoard.elementIds()).find((id) => id !== first && id !== theirs);

    await ownerBoard.page.keyboard.press("Control+z");

    await expect.poll(() => ownerBoard.elementIds()).not.toContain(second);
    const afterUndo = await ownerBoard.elementIds();
    expect(afterUndo, "the teammate's rectangle survives the undo").toContain(theirs);
    expect(afterUndo, "only the last own step is undone").toContain(first);
    const expected = [first, theirs].sort();
    await expect.poll(async () => (await teammateBoard.elementIds()).sort()).toEqual(expected);
    await expect
      .poll(async () => (await liveElementIds(owner.api, diagram.id)).sort())
      .toEqual(expected);
  });

  test("a follower's viewport tracks the leader", async ({ createUser, openAs }) => {
    const { owner, diagram, ownerBoard, teammateBoard } = await sharedBoard(
      { createUser, openAs },
      { title: "Follow Mode", elements: [rectangle("landmark")] },
    );
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);

    await teammateBoard.page.getByTitle("Share & Collaborate").click();
    await teammateBoard.page
      .locator("#board-sidebar")
      .getByRole("button", { name: "Follow", exact: true })
      .click();
    await expect(teammateBoard.page.getByText(`Following ${owner.name}`)).toBeVisible();

    const pointer = await ownerBoard.canvasPoint(400, 300);
    await ownerBoard.page.mouse.move(pointer.x, pointer.y);
    await ownerBoard.page.mouse.wheel(0, 400);
    await expect.poll(async () => (await viewport(ownerBoard.page)).scrollY).not.toBe(0);
    const leader = await viewport(ownerBoard.page);

    await expect.poll(() => viewport(teammateBoard.page)).toEqual(leader);
  });
});

import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createSnapshot, liveElementIds, rectangle } from "../../fixtures/api";
import { BoardPage } from "../../pages/board.page";
import { viewport } from "../../support/scene";
import { SocketTraffic } from "../../support/socket-traffic";
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

  test.fixme("a teammate sees a new rectangle without an echo or a conflict (bug: a drag's final version is never broadcast and the teammate re-saves what it received)", async ({
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

  test.fixme("a delete wins over a teammate's concurrent drag (bug: the teammate who was dragging keeps the deleted element)", async ({
    createUser,
    openAs,
  }) => {
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

    const target = await ownerBoard.canvasPoint(580, 300);
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

  test("restoring a snapshot updates every open client", async ({ createUser, openAs }) => {
    const { owner, diagram, ownerBoard, teammateBoard } = await sharedBoard(
      { createUser, openAs },
      { title: "Restore", elements: [rectangle("before-rect")] },
    );
    // Scenes are created on the first room join, and snapshots need one.
    const opener = new BoardPage(await openAs(owner.storageState));
    await opener.open(diagram.id);
    await opener.page.close();
    await createSnapshot(owner.api, diagram.id, "Before change");
    const changed = await owner.api.patch(`/api/diagrams/${diagram.id}`, {
      data: { elements: [rectangle("after-rect", 400, 100)] },
    });
    expect(changed.ok()).toBeTruthy();
    await ownerBoard.open(diagram.id);
    await teammateBoard.open(diagram.id);
    await expect.poll(() => ownerBoard.elementIds()).toEqual(["after-rect"]);
    await expect.poll(() => teammateBoard.elementIds()).toEqual(["after-rect"]);

    await ownerBoard.page.getByTitle("Version History").click();
    await ownerBoard.page.getByText("Before change").click();
    await ownerBoard.page.getByRole("button", { name: "Restore this version" }).click();

    await expect.poll(() => ownerBoard.elementIds()).toEqual(["before-rect"]);
    await expect.poll(() => teammateBoard.elementIds()).toEqual(["before-rect"]);
    await expect.poll(() => liveElementIds(owner.api, diagram.id)).toEqual(["before-rect"]);
  });

  test.fixme("undo does not revert a teammate's change (bug: remote updates join the local undo stack)", async ({
    createUser,
    openAs,
  }) => {
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

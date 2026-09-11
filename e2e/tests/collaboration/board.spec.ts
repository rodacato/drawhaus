import type { WebSocketRoute } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram, liveElementIds } from "../../fixtures/api";
import { BoardPage } from "../../pages/board.page";
import { isEditFrame } from "../../support/socket-traffic";

test.describe("Board canvas", () => {
  test.describe.configure({ timeout: 90_000 });

  test.fixme("a fresh board opens editable for its owner (bug: cold load stays in view mode)", async ({
    page,
    request,
  }) => {
    const diagram = await createDiagram(request, { title: "Cold Load" });
    const board = new BoardPage(page);

    await board.open(diagram.id);
    await board.waitForEditorRole();

    await expect(board.viewMode).toHaveCount(0);
    await expect(page.getByTestId("toolbar-rectangle")).toBeVisible();
  });

  test("the owner's rectangle survives a reload", async ({ page, request }) => {
    const diagram = await createDiagram(request, { title: "Persist Rectangle" });
    const board = new BoardPage(page);
    await board.open(diagram.id);
    await board.waitForEditorRole();
    await board.ensureEditable();

    await board.drawRectangle();
    await expect.poll(() => board.elementIds()).toHaveLength(1);
    const [drawn] = await board.elementIds();
    await board.waitUntilSaved();

    await page.reload();
    await board.waitForCanvas();

    await expect.poll(() => board.elementIds()).toEqual([drawn]);
    expect(await liveElementIds(request, diagram.id)).toEqual([drawn]);
  });

  test("an edit made offline syncs once the connection returns", async ({
    page,
    context,
    request,
  }) => {
    const diagram = await createDiagram(request, { title: "Offline Edit" });
    let online = true;
    const sockets: WebSocketRoute[] = [];
    await page.routeWebSocket(/\/socket\.io\//, (ws) => {
      if (!online) return ws.close();
      ws.connectToServer();
      sockets.push(ws);
    });
    const board = new BoardPage(page);
    await board.open(diagram.id);
    await board.waitForEditorRole();
    await board.ensureEditable();

    // Chromium's offline emulation keeps open WebSockets alive, so drop the socket as a real outage would.
    online = false;
    await context.setOffline(true);
    await Promise.all(sockets.map((ws) => ws.close()));
    await expect(board.connectionBadge).toBeVisible({ timeout: 30_000 });
    await board.drawRectangle();
    await expect.poll(() => board.elementIds()).toHaveLength(1);
    const [drawn] = await board.elementIds();

    await context.setOffline(false);

    await expect(board.connectionBadge).toHaveCount(0, { timeout: 30_000 });
    await expect
      .poll(() => liveElementIds(request, diagram.id), { timeout: 20_000 })
      .toEqual([drawn]);
    expect(await board.elementIds()).toEqual([drawn]);
  });

  test.fixme("Ctrl+S never reports a save the server did not receive (bug: the saved toast fires on emit, before the server acknowledges)", async ({
    page,
    request,
  }) => {
    const diagram = await createDiagram(request, { title: "Unacknowledged Save" });
    let dropEdits = false;
    let killSocket = () => {};
    await page.routeWebSocket(/\/socket\.io\//, (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((message) => {
        if (!(dropEdits && isEditFrame(message))) server.send(message);
      });
      killSocket = () => ws.close();
    });
    const board = new BoardPage(page);
    await board.open(diagram.id);
    await board.waitForEditorRole();
    await board.ensureEditable();

    dropEdits = true;
    await board.drawRectangle();
    await expect.poll(() => board.elementIds()).toHaveLength(1);
    const savedToast = page
      .getByText("Diagrama guardado")
      .waitFor({ timeout: 3_000 })
      .then(
        () => true,
        () => false,
      );
    await page.keyboard.press("Control+s");
    killSocket();

    expect(await savedToast).toBe(false);
    await expect(board.saveBadge).not.toHaveText(/^Saved /);
    expect(await liveElementIds(request, diagram.id)).toEqual([]);
  });
});

import type { Page } from "@playwright/test";
import { test, expect, SIGNED_OUT } from "../../fixtures/test";
import { createDiagram, createShareLink } from "../../fixtures/api";
import { BoardPage } from "../../pages/board.page";
import { hasEvent } from "../../support/socket-traffic";

async function joinShare(page: Page, token: string, name: string) {
  await page.goto(`/share/${token}`);
  await page.locator('input[type="text"]').fill(name);
  await page.locator('input[type="text"]').press("Enter");
}

async function droppableSocket(page: Page) {
  const state = { roomJoins: 0, drop: () => {} };
  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    const server = ws.connectToServer();
    server.onMessage((message) => {
      if (hasEvent(message, "room-joined")) state.roomJoins += 1;
      ws.send(message);
    });
    state.drop = () => ws.close();
  });
  return state;
}

test.describe("Socket handshake", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a guest reconnects with its share link after the socket drops", async ({
    createUser,
    openAs,
  }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Guest Reconnect" });
    const token = await createShareLink(owner.api, diagram.id, "viewer");
    const guest = new BoardPage(await openAs(SIGNED_OUT));
    const socket = await droppableSocket(guest.page);
    await joinShare(guest.page, token, "Reader");
    await guest.waitForCanvas();
    await expect.poll(() => socket.roomJoins).toBe(1);

    socket.drop();

    await expect.poll(() => socket.roomJoins, { timeout: 20_000 }).toBe(2);
    await expect(guest.connectionBadge).toHaveCount(0);
  });

  test("a guest whose link was revoked is told why when the socket reconnects", async ({
    createUser,
    openAs,
  }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Revoked While Open" });
    const token = await createShareLink(owner.api, diagram.id, "viewer");
    const guest = new BoardPage(await openAs(SIGNED_OUT));
    const socket = await droppableSocket(guest.page);
    await joinShare(guest.page, token, "Reader");
    await guest.waitForCanvas();
    await expect.poll(() => socket.roomJoins).toBe(1);

    expect((await owner.api.delete(`/api/share/link/${token}`)).ok()).toBeTruthy();
    socket.drop();

    await expect(guest.page.getByText("Este enlace ya no es válido. Pide uno nuevo.")).toBeVisible({
      timeout: 20_000,
    });
    expect(socket.roomJoins).toBe(1);
  });

  test("a board whose session ended is told why when the socket reconnects", async ({
    createUser,
    openAs,
  }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "Signed Out While Open" });
    const board = new BoardPage(await openAs(owner.storageState));
    const socket = await droppableSocket(board.page);
    await board.open(diagram.id);
    await expect.poll(() => socket.roomJoins).toBe(1);

    expect((await owner.api.post("/api/auth/logout")).ok()).toBeTruthy();
    socket.drop();

    await expect(
      board.page.getByText("Tu sesión terminó. Recarga la página para volver a entrar."),
    ).toBeVisible({ timeout: 20_000 });
    expect(socket.roomJoins).toBe(1);
  });
});

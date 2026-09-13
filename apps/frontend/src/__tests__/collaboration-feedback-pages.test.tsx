import { describe, test, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./_helpers/render";
import {
  createExcalidrawApiStub,
  createMockSocket,
  triggerSocketEvent,
  type MockSocket,
} from "./_helpers/mock-socket";

const live = vi.hoisted(() => ({
  socket: null as unknown,
  canvas: null as unknown,
  shareRole: "editor" as "editor" | "viewer",
}));

vi.mock("@excalidraw/excalidraw", () => ({ restoreElements: (els: unknown[]) => els }));
vi.mock("@/components/ExcalidrawCanvas", () => ({
  ExcalidrawCanvas: ({ excalidrawAPI }: { excalidrawAPI?: (api: unknown) => void }) => {
    excalidrawAPI?.(live.canvas);
    return <div data-testid="excalidraw-canvas" />;
  },
}));
vi.mock("@/lib/services/socket", () => ({ createSocket: () => live.socket }));
vi.mock("@/api/share", () => ({
  shareApi: {
    resolve: vi.fn(async () => ({
      diagramId: "d1",
      elements: [],
      appState: {},
      role: live.shareRole,
      title: "Shared",
    })),
  },
}));
vi.mock("@/api/comments", () => ({
  commentsApi: { list: vi.fn().mockResolvedValue({ threads: [] }) },
}));

import { Share } from "../pages/Share";
import BoardEditor from "../components/BoardEditor";

type Canvas = ReturnType<typeof createExcalidrawApiStub>;
type Role = "owner" | "editor" | "viewer";

const EVERY_FEEDBACK = /que editabas|fue reemplazado/;

function socket(): MockSocket {
  return live.socket as MockSocket;
}

function canvas(): Canvas {
  return live.canvas as Canvas;
}

function emit(event: string, payload: unknown) {
  act(() => triggerSocketEvent(socket(), event, payload));
}

async function openShare(role: "editor" | "viewer") {
  live.shareRole = role;
  localStorage.setItem("drawhaus_guest_tok123", "Invitada");
  renderWithProviders(<Share />, { route: "/share/tok123", path: "/share/:token" });
  await screen.findByTestId("excalidraw-canvas");
}

async function openBoard() {
  renderWithProviders(
    <BoardEditor
      diagramId="d1"
      title="Board"
      userEmail="me@x.com"
      initialElements={[]}
      initialAppState={{}}
    />,
  );
  await screen.findByTestId("excalidraw-canvas");
}

/** The room hands this client a scene, then three collaborator events land on its edits. */
async function collaborateAs(role: Role) {
  act(() => triggerSocketEvent(socket(), "connect"));
  emit("scene-from-db", {
    elements: [
      { id: "a", version: 1 },
      { id: "b", version: 1 },
      { id: "c", version: 1 },
    ],
    revision: 1,
  });
  await waitFor(() => expect(canvas()._state.elements).toHaveLength(3));
  emit("room-joined", { roomId: "d1", role, userId: "me" });
  emit("room-presence", { users: [{ userId: "user-ana", name: "Ana" }] });

  // Bumped in place, as Excalidraw does for a user's edit and for an element it re-indexes.
  for (const el of canvas()._state.elements as { version: number }[]) el.version += 1;

  emit("scene-delta-received", {
    fromSocketId: "sock-ana",
    fromUserId: "user-ana",
    changed: [{ id: "a", version: 9 }],
    removedIds: ["b"],
    revision: 1,
  });
  emit("scene-from-db", { elements: [{ id: "z", version: 1 }], revision: 2 });
  await waitFor(() => expect(canvas()._state.elements).toEqual([{ id: "z", version: 1 }]));
}

async function expectAllThreeToasts() {
  expect(await screen.findByText("Ana modificó un elemento que editabas")).toBeTruthy();
  expect(screen.getByText("Ana eliminó un elemento que editabas")).toBeTruthy();
  expect(
    screen.getByText("El diagrama fue reemplazado; se descartaron tus cambios en un elemento"),
  ).toBeTruthy();
}

beforeEach(() => {
  localStorage.clear();
  live.socket = createMockSocket({ id: "sock-me" });
  live.canvas = createExcalidrawApiStub();
});

describe("collaboration feedback on the pages that edit a board", () => {
  test("a share-link editor is told about conflicts, remote deletes and a replace", async () => {
    await openShare("editor");
    await collaborateAs("editor");

    await expectAllThreeToasts();
  });

  test("a share-link viewer is told nothing, though the same events reached its canvas", async () => {
    await openShare("viewer");
    await collaborateAs("viewer");

    expect(screen.getByText("View only")).toBeTruthy();
    expect(screen.queryAllByText(EVERY_FEEDBACK)).toHaveLength(0);
  });

  test("a signed-in editor on the board still gets all three", async () => {
    await openBoard();
    await collaborateAs("owner");

    await expectAllThreeToasts();
  });

  test("a signed-in viewer on the board is told nothing either", async () => {
    await openBoard();
    await collaborateAs("viewer");

    expect(screen.queryAllByText(EVERY_FEEDBACK)).toHaveLength(0);
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router-dom";
import { renderWithProviders } from "./_helpers/render";
import { createMockSocket, triggerSocketEvent, type MockSocket } from "./_helpers/mock-socket";

type OnChange = (elements: readonly unknown[], appState: Record<string, unknown>) => void;

const { sockets, canvas, api } = vi.hoisted(() => ({
  sockets: [] as MockSocket[],
  canvas: { mounts: 0, onChange: null as OnChange | null },
  api: { get: (_id: string): Promise<unknown> => Promise.reject(new Error("unset")) },
}));

// Excalidraw reads initialData only at mount; the stub keeps that contract so a reused
// editor keeps showing the previous board's elements, as the real canvas would.
vi.mock("@/components/ExcalidrawCanvas", async () => {
  const { useEffect, useState } = await import("react");
  return {
    ExcalidrawCanvas: (props: { initialData: { elements: unknown[] }; onChange?: OnChange }) => {
      const [initial] = useState(() => props.initialData);
      useEffect(() => {
        canvas.mounts += 1;
      }, []);
      canvas.onChange = props.onChange ?? null;
      const ids = (initial.elements as Array<{ id: string }>).map((e) => e.id).join(",");
      return <div data-testid="excalidraw-canvas" data-elements={ids} />;
    },
  };
});
vi.mock("@excalidraw/excalidraw", () => ({ restoreElements: (els: unknown[]) => els }));
vi.mock("@/lib/services/socket", () => ({
  createSocket: () => {
    const socket = createMockSocket({ id: `sock-${sockets.length + 1}` });
    sockets.push(socket);
    return socket;
  },
}));
vi.mock("@/api/diagrams", () => ({
  diagramsApi: {
    get: (id: string) => api.get(id),
    update: vi.fn().mockResolvedValue({}),
    updateThumbnail: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("@/api/comments", () => ({
  commentsApi: { list: vi.fn().mockResolvedValue({ threads: [] }) },
}));
vi.mock("@/api/auth", () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({ id: "u1", name: "Me", email: "me@x.com", role: "user" }),
  },
}));

import { Board } from "../pages/Board";

const diagram = (id: string) => ({
  diagram: {
    id,
    title: `Board ${id}`,
    elements: [{ id: `el-${id}` }],
    appState: {},
    workspaceId: null,
  },
});

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function GoToB() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/board/B")}>go to B</button>;
}

function renderBoardA() {
  renderWithProviders(
    <>
      <Board />
      <GoToB />
    </>,
    { route: "/board/A", path: "/board/:id" },
  );
}

const canvasElements = () => screen.queryByTestId("excalidraw-canvas")?.dataset.elements;

describe("Board — navigating between boards", () => {
  beforeEach(() => {
    sockets.length = 0;
    canvas.mounts = 0;
    canvas.onChange = null;
    api.get = (id) => Promise.resolve(diagram(id));
  });

  test("mounts a fresh editor for B that joins B and never sends A's id or scene", async () => {
    const user = userEvent.setup();
    renderBoardA();
    await waitFor(() => expect(canvasElements()).toBe("el-A"));
    const socketA = sockets[0];
    act(() => {
      triggerSocketEvent(socketA, "connect");
      triggerSocketEvent(socketA, "scene-from-db", { elements: [], activeSceneId: "scene-A" });
    });

    await user.click(screen.getByRole("button", { name: "go to B" }));
    await waitFor(() => expect(canvasElements()).toBe("el-B"));
    expect(canvas.mounts).toBe(2);
    expect(socketA.disconnect).toHaveBeenCalled();

    const socketB = sockets.at(-1)!;
    act(() => {
      triggerSocketEvent(socketB, "connect");
      triggerSocketEvent(socketB, "room-joined", { roomId: "B", role: "owner", userId: "u-1" });
    });
    act(() => {
      canvas.onChange?.([{ id: "el-B", version: 2 }], {
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
      });
    });

    expect(socketB.emit.mock.calls.filter(([event]) => event === "join-room")).toEqual([
      ["join-room", { roomId: "B" }],
    ]);
    expect(socketB.emit).toHaveBeenCalledWith(
      "scene-delta",
      expect.objectContaining({ roomId: "B", sceneId: null }),
    );
    const leaked = socketB.emit.mock.calls.filter(
      ([, payload]) => payload?.roomId === "A" || payload?.sceneId === "scene-A",
    );
    expect(leaked).toEqual([]);
  });

  test("while B loads, A's editor is gone and the loading screen shows", async () => {
    const user = userEvent.setup();
    const pendingB = deferred();
    renderBoardA();
    await waitFor(() => expect(canvasElements()).toBe("el-A"));
    api.get = (id) => (id === "B" ? pendingB.promise : Promise.resolve(diagram(id)));

    await user.click(screen.getByRole("button", { name: "go to B" }));
    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(canvasElements()).toBeUndefined();
    expect(sockets[0].disconnect).toHaveBeenCalled();

    await act(async () => {
      pendingB.resolve(diagram("B"));
    });
    await waitFor(() => expect(canvasElements()).toBe("el-B"));
  });

  test("a board that failed to load does not leave its error on the next board", async () => {
    const user = userEvent.setup();
    api.get = (id) =>
      id === "A" ? Promise.reject(new Error("404")) : Promise.resolve(diagram(id));
    renderBoardA();
    await waitFor(() => expect(screen.getByText("Diagram not found")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "go to B" }));
    await waitFor(() => expect(canvasElements()).toBe("el-B"));
    expect(screen.queryByText("Diagram not found")).toBeNull();
  });

  test("a late response for A does not replace board B", async () => {
    const user = userEvent.setup();
    const pendingA = deferred();
    api.get = (id) => (id === "A" ? pendingA.promise : Promise.resolve(diagram(id)));
    renderBoardA();

    await user.click(screen.getByRole("button", { name: "go to B" }));
    await waitFor(() => expect(canvasElements()).toBe("el-B"));
    await act(async () => {
      pendingA.resolve(diagram("A"));
    });

    expect(canvasElements()).toBe("el-B");
    expect(sockets).toHaveLength(1);
    expect(canvas.mounts).toBe(1);
  });
});

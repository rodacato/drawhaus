import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./_helpers/render";
import { createMockSocket, type MockSocket } from "./_helpers/mock-socket";

let nextSocket: MockSocket;

// Importing @excalidraw/excalidraw under vitest fails fast: it loads open-color's JSON
// without an import attribute ("type: json"). Stub the wrapper so canvas pages can mount.
vi.mock("@/components/ExcalidrawCanvas", () => ({
  ExcalidrawCanvas: () => <div data-testid="excalidraw-canvas" />,
}));
vi.mock("@/lib/services/socket", () => ({ createSocket: () => nextSocket }));
vi.mock("@/api/share", () => ({
  shareApi: {
    resolve: vi
      .fn()
      .mockResolvedValue({ elements: [], appState: {}, role: "viewer", title: "Shared" }),
  },
}));
vi.mock("@/api/diagrams", () => ({
  diagramsApi: {
    get: vi.fn().mockResolvedValue({
      diagram: { id: "d1", title: "Board", elements: [], appState: {}, workspaceId: null },
    }),
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

import { Embed } from "../pages/Embed";
import { Share } from "../pages/Share";
import { Board } from "../pages/Board";
import { AppRouter } from "../router";

beforeEach(() => {
  nextSocket = createMockSocket();
});

describe("canvas pages — smoke (ExcalidrawCanvas + socket stubbed)", () => {
  test("Embed mounts the canvas once the share resolves", async () => {
    renderWithProviders(<Embed />, { route: "/embed/tok123", path: "/embed/:token" });
    await waitFor(() => expect(screen.getByTestId("excalidraw-canvas")).toBeTruthy());
  });

  test("Share renders the join screen once the share resolves", async () => {
    renderWithProviders(<Share />, { route: "/share/tok123", path: "/share/:token" });
    // The viewer must enter a name before the canvas mounts; assert that gate renders.
    await waitFor(() => expect(screen.getByRole("heading", { name: /shared/i })).toBeTruthy());
  });

  test("the lazy /embed/:token route shows the loading screen, then mounts the canvas", async () => {
    renderWithProviders(<AppRouter />, { route: "/embed/tok123" });
    expect(screen.getByText("Loading...")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("excalidraw-canvas")).toBeTruthy());
    expect(screen.queryByRole("heading", { name: /something went wrong/i })).toBeNull();
  });

  test("Board mounts the editor once the diagram loads", async () => {
    renderWithProviders(<Board />, { route: "/board/d1", path: "/board/:id" });
    await waitFor(() => expect(screen.getByTestId("excalidraw-canvas")).toBeTruthy());
  });
});

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@excalidraw/excalidraw", () => ({
  exportToBlob: async () => {
    throw new Error("render failed");
  },
  exportToSvg: async () => {
    throw new Error("render failed");
  },
}));

vi.mock("@/api/drive", () => ({
  driveApi: { getStatus: async () => ({ connected: false }) },
}));

import { ExportPanel } from "@/components/board-sidebar/ExportPanel";

describe("ExportPanel", () => {
  test("a failed export is announced as an error, not shown as a success", async () => {
    const api = { getSceneElements: () => [], getAppState: () => ({}), getFiles: () => ({}) };
    render(<ExportPanel excalidrawApiRef={{ current: api } as never} />);

    await userEvent.click(screen.getByRole("button", { name: /^PNG/ }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not export the PNG. Try again.");
    expect(alert.className).toContain("text-error");
    expect(screen.queryByRole("status")).toBeNull();
  });
});

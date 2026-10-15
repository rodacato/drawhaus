import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { conversion } = vi.hoisted(() => ({ conversion: { elements: [] as unknown[] } }));

vi.mock("@/lib/diagram-code/convert-to-excalidraw", () => ({
  mermaidToElements: async () => conversion.elements,
  plantumlToElements: async () => ({ elements: conversion.elements, diagramType: "class" }),
}));

vi.mock("@/lib/diagram-code/mermaid-renderer", () => ({
  renderMermaid: async () => ({ svg: "<svg />", isFallback: false }),
}));

import { CodeImportPanel } from "@/components/board-sidebar/CodeImportPanel";
import { ConfirmProvider } from "@/components/ConfirmDialog";

const FLOWCHART = "graph TD\n    A-->B";

function renderPanel(existing: unknown[] = []) {
  const updateScene = vi.fn();
  const onClose = vi.fn();
  const excalidrawApiRef = {
    current: { getSceneElements: () => existing, updateScene },
  } as unknown as React.RefObject<never>;
  render(
    <ConfirmProvider>
      <CodeImportPanel excalidrawApiRef={excalidrawApiRef} onClose={onClose} />
    </ConfirmProvider>,
  );
  return { updateScene, onClose };
}

async function typeAndImport(code: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("textbox"));
  await user.paste(code);
  const addToCanvas = () =>
    screen.getByRole<HTMLButtonElement>("button", { name: /Add to Canvas/i });
  await waitFor(() => expect(addToCanvas().disabled).toBe(false));
  await user.click(addToCanvas());
}

describe("CodeImportPanel", () => {
  beforeEach(() => {
    conversion.elements = [];
  });

  test("a conversion that yields no elements reports it instead of importing nothing", async () => {
    const { updateScene, onClose } = renderPanel();

    await typeAndImport(FLOWCHART);

    expect(await screen.findByText(/produced no elements/i)).toBeTruthy();
    expect(updateScene).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("a conversion that yields elements imports them and closes the panel", async () => {
    conversion.elements = [{ id: "el-1", type: "rectangle" }];
    const { updateScene, onClose } = renderPanel();

    await typeAndImport(FLOWCHART);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateScene).toHaveBeenCalledWith({
      elements: [{ id: "el-1", type: "rectangle" }],
    });
    expect(screen.queryByText(/produced no elements/i)).toBeNull();
  });

  test("replacing the canvas asks first and keeps everything when cancelled", async () => {
    conversion.elements = [{ id: "el-1", type: "rectangle" }];
    const { updateScene, onClose } = renderPanel([{ id: "old-1" }, { id: "old-2" }]);

    await userEvent.click(screen.getByLabelText("Replace existing elements"));
    await typeAndImport(FLOWCHART);

    expect(await screen.findByText(/removes the 2 elements/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(updateScene).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("confirming the replacement swaps the canvas for the new elements", async () => {
    conversion.elements = [{ id: "el-1", type: "rectangle" }];
    const { updateScene, onClose } = renderPanel([{ id: "old-1" }]);

    await userEvent.click(screen.getByLabelText("Replace existing elements"));
    await typeAndImport(FLOWCHART);
    await userEvent.click(await screen.findByRole("button", { name: "Replace" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateScene).toHaveBeenCalledWith({ elements: [{ id: "el-1", type: "rectangle" }] });
  });
});

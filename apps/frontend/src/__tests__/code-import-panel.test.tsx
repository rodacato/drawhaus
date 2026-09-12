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

const FLOWCHART = "graph TD\n    A-->B";

function renderPanel() {
  const updateScene = vi.fn();
  const onClose = vi.fn();
  const excalidrawApiRef = {
    current: { getSceneElements: () => [], updateScene },
  } as unknown as React.RefObject<never>;
  render(<CodeImportPanel excalidrawApiRef={excalidrawApiRef} onClose={onClose} />);
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

    expect(await screen.findByText(/no produjo ningún elemento/i)).toBeTruthy();
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
    expect(screen.queryByText(/no produjo ningún elemento/i)).toBeNull();
  });
});

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@excalidraw/excalidraw/index.css", () => ({}));
vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: (props: { theme?: string }) => <div data-testid="canvas" data-theme={props.theme} />,
}));

const themeState = vi.hoisted(() => ({ theme: "light" as "light" | "dark" }));
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: themeState.theme, toggleTheme: vi.fn(), setTheme: vi.fn() }),
}));

import { ExcalidrawCanvas } from "../components/ExcalidrawCanvas";

describe("ExcalidrawCanvas", () => {
  test.each(["light", "dark"] as const)("hands the %s app theme to the canvas", async (theme) => {
    themeState.theme = theme;
    render(<ExcalidrawCanvas initialData={{ elements: [], appState: {} }} />);
    const canvas = await screen.findByTestId("canvas");
    expect(canvas.getAttribute("data-theme")).toBe(theme);
  });
});

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { themeState } = vi.hoisted(() => ({
  themeState: { theme: "light" as "light" | "dark", toggle: vi.fn() },
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: themeState.theme,
    toggleTheme: themeState.toggle,
    setTheme: vi.fn(),
  }),
}));

import { ThemeToggle } from "../components/ThemeToggle";

describe("ThemeToggle", () => {
  test("renders the dark-mode tooltip when in light mode", () => {
    themeState.theme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button").getAttribute("title")).toBe("Switch to dark mode");
  });

  test("renders the light-mode tooltip when in dark mode", () => {
    themeState.theme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button").getAttribute("title")).toBe("Switch to light mode");
  });

  test("clicking calls toggleTheme from the context", async () => {
    themeState.theme = "light";
    themeState.toggle.mockClear();
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));
    expect(themeState.toggle).toHaveBeenCalledOnce();
  });

  test("appends className prop to the button class list", () => {
    themeState.theme = "light";
    render(<ThemeToggle className="extra-class-x" />);
    expect(screen.getByRole("button").className).toContain("extra-class-x");
  });
});

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ logout: vi.fn() }) }));

import { SettingsPanel } from "@/components/board-sidebar/SettingsPanel";

const prefs = {
  gridModeEnabled: true,
  gridSize: 20,
  viewBackgroundColor: "#ffffff",
  objectsSnapModeEnabled: true,
};

function renderPanel(onChange = vi.fn()) {
  render(
    <MemoryRouter>
      <SettingsPanel
        userEmail="ana@example.com"
        onDashboardClick={vi.fn()}
        canvasPrefs={prefs as never}
        onCanvasPrefsChange={onChange}
      />
    </MemoryRouter>,
  );
  return onChange;
}

describe("SettingsPanel", () => {
  test("the grid sizes and background swatches have names and report which one is active", async () => {
    const onChange = renderPanel();

    expect(screen.getByRole("button", { name: "Medium", pressed: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Small", pressed: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Background White", pressed: true })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Background Cream" }));
    expect(onChange).toHaveBeenCalledWith({ viewBackgroundColor: "#fef9ef" });
  });
});

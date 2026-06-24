import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CursorOverlay } from "../components/CursorOverlay";

describe("CursorOverlay", () => {
  test("renders nothing visible when cursors record is empty", () => {
    const { container } = render(<CursorOverlay cursors={{}} />);
    expect(container.querySelectorAll(".absolute").length).toBe(0);
  });

  test("renders one cursor per entry, positioned by left/top from x/y", () => {
    render(
      <CursorOverlay
        cursors={{
          u1: { name: "Adrian", x: 120, y: 80, lastSeen: 0 },
          u2: { name: "Lupita", x: 300, y: 200, lastSeen: 0 },
        }}
      />,
    );

    const adrian = screen.getByText("Adrian");
    const adrianRow = adrian.parentElement as HTMLElement;
    expect(adrianRow.style.left).toBe("120px");
    expect(adrianRow.style.top).toBe("80px");

    const lupita = screen.getByText("Lupita");
    const lupitaRow = lupita.parentElement as HTMLElement;
    expect(lupitaRow.style.left).toBe("300px");
    expect(lupitaRow.style.top).toBe("200px");
  });
});

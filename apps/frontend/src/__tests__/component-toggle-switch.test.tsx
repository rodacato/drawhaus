import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleSwitch } from "../components/ToggleSwitch";

describe("ToggleSwitch", () => {
  test("is a named switch that exposes its state to assistive tech", () => {
    const { rerender } = render(
      <ToggleSwitch label="Maintenance Mode" checked={false} onChange={() => {}} />,
    );
    const toggle = screen.getByRole("switch", { name: "Maintenance Mode" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.className).toContain("bg-border-input");
    expect(toggle.className).not.toContain("bg-primary");

    rerender(<ToggleSwitch label="Maintenance Mode" checked onChange={() => {}} />);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.className).toContain("bg-primary");
  });

  test("clicking calls onChange with the negated value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch label="Grid" checked={false} onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: "Grid" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("clicking while checked calls onChange(false)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch label="Grid" checked onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: "Grid" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test("disabled switch does not fire onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch label="Grid" checked={false} onChange={onChange} disabled />);
    const toggle = screen.getByRole("switch", { name: "Grid" }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
    await user.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });
});

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleSwitch } from "../components/ToggleSwitch";

describe("ToggleSwitch", () => {
  test("renders a button reflecting the checked state via class", () => {
    const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-border");
    expect(button.className).not.toContain("bg-primary");

    rerender(<ToggleSwitch checked onChange={() => {}} />);
    expect(button.className).toContain("bg-primary");
    expect(button.className).not.toContain("bg-border");
  });

  test("clicking calls onChange with the negated value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    await user.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("clicking while checked calls onChange(false)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch checked onChange={onChange} />);
    await user.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test("disabled button does not fire onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });
});

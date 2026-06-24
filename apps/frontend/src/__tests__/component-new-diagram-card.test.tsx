import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewDiagramCard } from "../components/dashboard/NewDiagramCard";

describe("NewDiagramCard", () => {
  test("renders the New Diagram label", () => {
    render(<NewDiagramCard onClick={() => {}} />);
    expect(screen.getByText("New Diagram")).toBeTruthy();
  });

  test("clicking fires onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<NewDiagramCard onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("disabled prevents onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<NewDiagramCard onClick={onClick} disabled />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

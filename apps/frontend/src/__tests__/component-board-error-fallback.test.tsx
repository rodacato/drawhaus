import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardErrorFallback } from "../components/BoardErrorFallback";

describe("BoardErrorFallback", () => {
  test("renders an Error's message", () => {
    render(<BoardErrorFallback error={new Error("boom")} resetErrorBoundary={() => {}} />);
    expect(screen.getByText("boom")).toBeTruthy();
    expect(screen.getByText("Something went wrong loading the board")).toBeTruthy();
  });

  test("renders non-Error values via String()", () => {
    render(<BoardErrorFallback error={"plain string failure"} resetErrorBoundary={() => {}} />);
    expect(screen.getByText("plain string failure")).toBeTruthy();
  });

  test("clicking Try again calls resetErrorBoundary", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<BoardErrorFallback error={new Error("x")} resetErrorBoundary={reset} />);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        increment
      </button>
    </div>
  );
}

describe("React testing infrastructure (proof of concept)", () => {
  test("renders props into the DOM", () => {
    render(<Counter start={3} />);
    expect(screen.getByTestId("count").textContent).toBe("3");
  });

  test("state updates after a user interaction", async () => {
    const user = userEvent.setup();
    render(<Counter />);
    await user.click(screen.getByRole("button", { name: /increment/i }));
    await user.click(screen.getByRole("button", { name: /increment/i }));
    expect(screen.getByTestId("count").textContent).toBe("2");
  });
});

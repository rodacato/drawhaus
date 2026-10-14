import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "../components/PasswordInput";

describe("PasswordInput", () => {
  test("starts hidden and the toggle reveals and hides the value", async () => {
    render(<PasswordInput aria-label="Password" />);
    const input = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(input.getAttribute("type")).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(toggle);
    expect(input.getAttribute("type")).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.getAttribute("type")).toBe("password");
  });

  test("follows a controlled visibility and reports changes", async () => {
    const seen: boolean[] = [];
    render(<PasswordInput aria-label="Password" visible onVisibleChange={(v) => seen.push(v)} />);
    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("text");
    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(seen).toEqual([false]);
  });

  test("renders no toggle when it is turned off", () => {
    render(<PasswordInput aria-label="Confirm" showToggle={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

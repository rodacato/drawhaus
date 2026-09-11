import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";

const { crash, captureException } = vi.hoisted(() => ({
  crash: { on: true },
  captureException: vi.fn(),
}));

vi.mock("@sentry/react", () => ({ captureException }));
vi.mock("@/pages/Terms", () => ({
  Terms: () => {
    if (crash.on) throw new Error("terms exploded");
    return <h1>Terms page</h1>;
  },
}));

import { AppRouter } from "../router";

function GoToPrivacy() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/privacy")}>go to privacy</button>;
}

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRouter />
      <GoToPrivacy />
    </MemoryRouter>,
  );
}

const fallbackHeading = () => screen.queryByRole("heading", { name: /something went wrong/i });

describe("AppRouter root error boundary", () => {
  beforeEach(() => {
    crash.on = true;
    captureException.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("a route that throws renders the fallback and reports the error", () => {
    renderAt("/terms");
    expect(fallbackHeading()).toBeTruthy();
    expect(screen.getByText("terms exploded")).toBeTruthy();
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "terms exploded" }),
      expect.anything(),
    );
  });

  test("a healthy route renders without the fallback or a report", () => {
    renderAt("/privacy");
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeTruthy();
    expect(fallbackHeading()).toBeNull();
    expect(captureException).not.toHaveBeenCalled();
  });

  test("navigating away from the crashed route clears the fallback", async () => {
    const user = userEvent.setup();
    renderAt("/terms");
    await user.click(screen.getByRole("button", { name: /go to privacy/i }));
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeTruthy();
    expect(fallbackHeading()).toBeNull();
  });

  test("Try again re-renders the route once it stops throwing", async () => {
    const user = userEvent.setup();
    renderAt("/terms");
    crash.on = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByRole("heading", { name: "Terms page" })).toBeTruthy();
    expect(fallbackHeading()).toBeNull();
  });
});

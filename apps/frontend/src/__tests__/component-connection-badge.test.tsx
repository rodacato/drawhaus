import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionBadge } from "../components/ConnectionBadge";

describe("ConnectionBadge", () => {
  test("renders nothing when connected", () => {
    const { container } = render(<ConnectionBadge connectionState="connected" connectionError={null} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders error styling and error message when in error state", () => {
    render(<ConnectionBadge connectionState="error" connectionError="socket dropped" />);
    const badge = screen.getByText("socket dropped");
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-700");
  });

  test("falls back to a generic error label when in error state with no message", () => {
    render(<ConnectionBadge connectionState="error" connectionError={null} />);
    expect(screen.getByText("Connection error")).toBeTruthy();
  });

  test("renders the Reconnecting label with amber styling when disconnected", () => {
    render(<ConnectionBadge connectionState="disconnected" connectionError={null} />);
    const badge = screen.getByText("Reconnecting...");
    expect(badge.className).toContain("bg-amber-100");
  });

  test("renders the Connecting label with default styling for connecting state", () => {
    render(<ConnectionBadge connectionState="connecting" connectionError={null} />);
    const badge = screen.getByText("Connecting...");
    expect(badge.className).toContain("bg-blue-100");
  });
});

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TRIGGER_LABELS, timeAgo, SessionBadge } from "../components/board-sidebar/snapshot-helpers";

describe("TRIGGER_LABELS", () => {
  test("groups all auto-save triggers under Auto-save", () => {
    expect(TRIGGER_LABELS.open).toBe("Auto-save");
    expect(TRIGGER_LABELS.close).toBe("Auto-save");
    expect(TRIGGER_LABELS.interval).toBe("Auto-save");
  });

  test("manual trigger has its own label", () => {
    expect(TRIGGER_LABELS.manual).toBe("Manual");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  test("returns 'just now' under one minute", () => {
    expect(timeAgo(new Date("2026-06-24T11:59:30Z").toISOString())).toBe("just now");
  });

  test("returns minutes for under one hour", () => {
    expect(timeAgo(new Date("2026-06-24T11:55:00Z").toISOString())).toBe("5m ago");
  });

  test("returns hours for under one day", () => {
    expect(timeAgo(new Date("2026-06-24T09:00:00Z").toISOString())).toBe("3h ago");
  });

  test("returns days for one day or more", () => {
    expect(timeAgo(new Date("2026-06-22T12:00:00Z").toISOString())).toBe("2d ago");
  });
});

describe("SessionBadge", () => {
  test("renders nothing when activeUsers is 1", () => {
    const { container } = render(<SessionBadge activeUsers={1} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when activeUsers is 0", () => {
    const { container } = render(<SessionBadge activeUsers={0} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders the count when more than one user is active", () => {
    render(<SessionBadge activeUsers={4} />);
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByTitle("4 users in session")).toBeTruthy();
  });
});

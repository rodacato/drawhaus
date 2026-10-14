import { describe, test, expect } from "vitest";
import { formatUpdatedAt } from "../lib/format-utils";

describe("formatUpdatedAt", () => {
  test("formats a valid timestamp", () => {
    const label = formatUpdatedAt("2026-10-12T14:30:00.000Z");
    expect(label).toMatch(/2026/);
    expect(label).not.toMatch(/Invalid/);
  });

  test("returns null instead of 'Invalid Date' when the timestamp is missing or malformed", () => {
    expect(formatUpdatedAt(undefined)).toBeNull();
    expect(formatUpdatedAt(null)).toBeNull();
    expect(formatUpdatedAt("")).toBeNull();
    expect(formatUpdatedAt("not a date")).toBeNull();
  });
});

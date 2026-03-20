import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  isExpired,
  formatRelativeDate,
  formatSize,
  formatDate,
  detectDiagramFormat,
} from "../lib/format-utils";

// ── isExpired ──────────────────────────────────────────────

describe("isExpired", () => {
  test("returns false for null", () => {
    assert.equal(isExpired(null), false);
  });

  test("returns false for undefined", () => {
    assert.equal(isExpired(undefined), false);
  });

  test("returns false for empty string", () => {
    assert.equal(isExpired(""), false);
  });

  test("returns true for a past date", () => {
    assert.equal(isExpired("2020-01-01T00:00:00Z"), true);
  });

  test("returns false for a future date", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    assert.equal(isExpired(future), false);
  });
});

// ── formatRelativeDate ─────────────────────────────────────

describe("formatRelativeDate", () => {
  test("shows minutes for recent dates", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    assert.equal(formatRelativeDate(fiveMinAgo), "Created 5m ago");
  });

  test("shows hours for dates within a day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    assert.equal(formatRelativeDate(threeHoursAgo), "Created 3 hours ago");
  });

  test("shows singular hour", () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    assert.equal(formatRelativeDate(oneHourAgo), "Created 1 hour ago");
  });

  test("shows days for older dates", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    assert.equal(formatRelativeDate(twoDaysAgo), "Created 2 days ago");
  });

  test("shows singular day", () => {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    assert.equal(formatRelativeDate(oneDayAgo), "Created 1 day ago");
  });
});

// ── formatSize ─────────────────────────────────────────────

describe("formatSize", () => {
  test("returns empty for undefined", () => {
    assert.equal(formatSize(undefined), "");
  });

  test("returns empty for empty string", () => {
    assert.equal(formatSize(""), "");
  });

  test("formats bytes", () => {
    assert.equal(formatSize("500"), "500 B");
  });

  test("formats kilobytes", () => {
    assert.equal(formatSize("2048"), "2.0 KB");
  });

  test("formats megabytes", () => {
    assert.equal(formatSize("1572864"), "1.5 MB");
  });
});

// ── formatDate ─────────────────────────────────────────────

describe("formatDate", () => {
  test("formats an ISO date string", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    assert.ok(result.length > 0);
    // The exact format depends on locale, but it should contain the year
    assert.ok(result.includes("2024"));
  });
});

// ── detectDiagramFormat ────────────────────────────────────

describe("detectDiagramFormat", () => {
  test("detects PlantUML with @startuml", () => {
    assert.equal(detectDiagramFormat("@startuml\nclass A {}"), "plantuml");
  });

  test("detects PlantUML with @startactivity", () => {
    assert.equal(detectDiagramFormat("@startactivity\n:foo;"), "plantuml");
  });

  test("detects PlantUML with leading whitespace", () => {
    assert.equal(detectDiagramFormat("  @startuml\nclass A {}"), "plantuml");
  });

  test("defaults to mermaid", () => {
    assert.equal(detectDiagramFormat("graph TD\nA --> B"), "mermaid");
  });

  test("defaults to mermaid for empty string", () => {
    assert.equal(detectDiagramFormat(""), "mermaid");
  });
});

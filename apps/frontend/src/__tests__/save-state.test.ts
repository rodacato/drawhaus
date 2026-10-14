import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { deriveSaveLabel, deriveSaveColor, isCursorStale } from "../lib/save-state";

// ── deriveSaveLabel ────────────────────────────────────────

describe("deriveSaveLabel", () => {
  test("returns Ready for idle", () => {
    assert.equal(deriveSaveLabel("idle", null), "Ready");
  });

  test("returns Unsaved for pending", () => {
    assert.equal(deriveSaveLabel("pending", null), "Unsaved");
  });

  test("returns Saving... for saving", () => {
    assert.equal(deriveSaveLabel("saving", null), "Saving...");
  });

  test("returns Saved for saved without timestamp", () => {
    assert.equal(deriveSaveLabel("saved", null), "Saved");
  });

  test("returns Saved with timestamp when available", () => {
    assert.equal(deriveSaveLabel("saved", "12:30"), "Saved 12:30");
  });

  test("returns Error for error", () => {
    assert.equal(deriveSaveLabel("error", null), "Error");
  });
});

// ── deriveSaveColor ────────────────────────────────────────

describe("deriveSaveColor", () => {
  test("returns correct class for each state", () => {
    assert.ok(deriveSaveColor("idle").includes("bg-white"));
    assert.ok(deriveSaveColor("pending").includes("bg-amber"));
    assert.ok(deriveSaveColor("saving").includes("bg-blue"));
    assert.ok(deriveSaveColor("saved").includes("bg-emerald"));
    assert.ok(deriveSaveColor("error").includes("bg-red"));
  });
});

// ── isCursorStale ──────────────────────────────────────────

describe("isCursorStale", () => {
  test.each([
    ["fresh cursor", 1000, false],
    ["cursor exceeding the threshold", 5000, true],
    ["cursor well past the threshold", 10000, true],
    ["exactly at the default threshold", 5000, true],
    ["just under the default threshold", 4999, false],
  ])("%s: age %i ms -> stale %s", (_name, age, expected) => {
    const now = Date.now();
    assert.equal(isCursorStale(now - age, now), expected);
  });

  test("uses custom threshold", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 2000, now, 3000), false);
    assert.equal(isCursorStale(now - 3000, now, 3000), true);
  });
});

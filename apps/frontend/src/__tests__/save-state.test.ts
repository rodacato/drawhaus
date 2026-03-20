import test, { describe } from "node:test";
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
  test("returns false when cursor is fresh", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 1000, now), false);
  });

  test("returns true when cursor exceeds threshold", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 5000, now), true);
  });

  test("returns true when cursor is well past threshold", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 10000, now), true);
  });

  test("uses custom threshold", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 2000, now, 3000), false);
    assert.equal(isCursorStale(now - 3000, now, 3000), true);
  });

  test("boundary: exactly at default threshold is stale", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 5000, now), true);
  });

  test("boundary: just under default threshold is not stale", () => {
    const now = Date.now();
    assert.equal(isCursorStale(now - 4999, now), false);
  });
});

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { sortByUpdated, filterStarred, isValidExcalidrawFile } from "../lib/diagram-filters";

// ── sortByUpdated ──────────────────────────────────────────

describe("sortByUpdated", () => {
  test("sorts by updatedAt descending", () => {
    const items = [
      { id: "a", updatedAt: "2024-01-01T00:00:00Z" },
      { id: "b", updatedAt: "2024-06-01T00:00:00Z" },
      { id: "c", updatedAt: "2024-03-01T00:00:00Z" },
    ];
    const result = sortByUpdated(items);
    assert.deepEqual(result.map((i) => i.id), ["b", "c", "a"]);
  });

  test("supports updated_at (snake_case)", () => {
    const items = [
      { id: "a", updated_at: "2024-01-01T00:00:00Z" },
      { id: "b", updated_at: "2024-06-01T00:00:00Z" },
    ];
    const result = sortByUpdated(items);
    assert.equal(result[0].id, "b");
  });

  test("does not mutate original array", () => {
    const items = [
      { id: "a", updatedAt: "2024-01-01T00:00:00Z" },
      { id: "b", updatedAt: "2024-06-01T00:00:00Z" },
    ];
    sortByUpdated(items);
    assert.equal(items[0].id, "a");
  });

  test("handles empty array", () => {
    assert.deepEqual(sortByUpdated([]), []);
  });

  test("handles items without timestamps", () => {
    const items = [{ id: "a", updatedAt: undefined }, { id: "b", updatedAt: undefined }];
    const result = sortByUpdated(items);
    assert.equal(result.length, 2);
  });
});

// ── filterStarred ──────────────────────────────────────────

describe("filterStarred", () => {
  test("filters starred items", () => {
    const items = [
      { id: "a", starred: true },
      { id: "b", starred: false },
      { id: "c", starred: true },
    ];
    const result = filterStarred(items);
    assert.deepEqual(result.map((i) => i.id), ["a", "c"]);
  });

  test("returns empty for no starred items", () => {
    const items = [
      { id: "a", starred: false },
      { id: "b" },
    ];
    assert.deepEqual(filterStarred(items), []);
  });

  test("handles empty array", () => {
    assert.deepEqual(filterStarred([]), []);
  });
});

// ── isValidExcalidrawFile ──────────────────────────────────

describe("isValidExcalidrawFile", () => {
  test("accepts valid excalidraw data", () => {
    assert.equal(isValidExcalidrawFile({ type: "excalidraw", elements: [] }), true);
  });

  test("accepts data with elements", () => {
    assert.equal(isValidExcalidrawFile({ type: "excalidraw", elements: [{ id: "1" }] }), true);
  });

  test("rejects null", () => {
    assert.equal(isValidExcalidrawFile(null), false);
  });

  test("rejects undefined", () => {
    assert.equal(isValidExcalidrawFile(undefined), false);
  });

  test("rejects wrong type", () => {
    assert.equal(isValidExcalidrawFile({ type: "other", elements: [] }), false);
  });

  test("rejects missing elements", () => {
    assert.equal(isValidExcalidrawFile({ type: "excalidraw" }), false);
  });

  test("rejects non-array elements", () => {
    assert.equal(isValidExcalidrawFile({ type: "excalidraw", elements: "not-array" }), false);
  });

  test("rejects string", () => {
    assert.equal(isValidExcalidrawFile("string"), false);
  });

  test("rejects number", () => {
    assert.equal(isValidExcalidrawFile(42), false);
  });
});

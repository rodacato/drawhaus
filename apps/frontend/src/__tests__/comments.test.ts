import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { countElementComments } from "../lib/comments";

describe("countElementComments", () => {
  test("returns empty map for no threads", () => {
    const result = countElementComments([]);
    assert.equal(result.size, 0);
  });

  test("counts unresolved threads per element", () => {
    const threads = [
      { elementId: "el1", resolved: false },
      { elementId: "el1", resolved: false },
      { elementId: "el2", resolved: false },
    ];
    const result = countElementComments(threads);
    assert.equal(result.get("el1"), 2);
    assert.equal(result.get("el2"), 1);
  });

  test("ignores resolved threads", () => {
    const threads = [
      { elementId: "el1", resolved: true },
      { elementId: "el1", resolved: false },
      { elementId: "el2", resolved: true },
    ];
    const result = countElementComments(threads);
    assert.equal(result.get("el1"), 1);
    assert.equal(result.has("el2"), false);
  });

  test("returns empty map when all threads are resolved", () => {
    const threads = [
      { elementId: "el1", resolved: true },
      { elementId: "el2", resolved: true },
    ];
    const result = countElementComments(threads);
    assert.equal(result.size, 0);
  });

  test("handles single thread", () => {
    const threads = [{ elementId: "el1", resolved: false }];
    const result = countElementComments(threads);
    assert.equal(result.get("el1"), 1);
    assert.equal(result.size, 1);
  });
});

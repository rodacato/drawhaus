import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  mergeElements,
  jsonSafe,
  getAdaptiveThrottleMs,
  THROTTLE_MS,
  THROTTLE_MS_HEAVY,
  HEAVY_ELEMENT_THRESHOLD,
} from "../lib/collaboration";

// ── jsonSafe ─────────────────────────────────────────────────

describe("jsonSafe", () => {
  test("deep clones an object", () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = jsonSafe(original);
    assert.deepEqual(cloned, original);
    assert.notEqual(cloned, original);
    assert.notEqual(cloned.b, original.b);
  });

  test("strips undefined values", () => {
    const result = jsonSafe({ a: 1, b: undefined });
    assert.equal("b" in result, false);
  });

  test("clones arrays", () => {
    const arr = [1, 2, { nested: true }];
    const cloned = jsonSafe(arr);
    assert.deepEqual(cloned, arr);
    assert.notEqual(cloned, arr);
    assert.notEqual(cloned[2], arr[2]);
  });

  test("handles null", () => {
    assert.equal(jsonSafe(null), null);
  });

  test("preserves string and number primitives", () => {
    assert.equal(jsonSafe("hello"), "hello");
    assert.equal(jsonSafe(42), 42);
  });
});

// ── getAdaptiveThrottleMs ────────────────────────────────────

describe("getAdaptiveThrottleMs", () => {
  test("returns normal throttle for small element count", () => {
    assert.equal(getAdaptiveThrottleMs(0), THROTTLE_MS);
    assert.equal(getAdaptiveThrottleMs(100), THROTTLE_MS);
    assert.equal(getAdaptiveThrottleMs(HEAVY_ELEMENT_THRESHOLD), THROTTLE_MS);
  });

  test("returns heavy throttle above threshold", () => {
    assert.equal(getAdaptiveThrottleMs(HEAVY_ELEMENT_THRESHOLD + 1), THROTTLE_MS_HEAVY);
    assert.equal(getAdaptiveThrottleMs(1000), THROTTLE_MS_HEAVY);
  });
});

// ── mergeElements ────────────────────────────────────────────

describe("mergeElements", () => {
  test("returns remote elements when local is empty", () => {
    const remote = [{ id: "a", version: 1, text: "hello" }];
    const result = mergeElements([], remote);
    assert.deepEqual(result, remote);
  });

  test("returns local elements when remote is empty", () => {
    const local = [{ id: "a", version: 1, text: "hello" }];
    const result = mergeElements(local, []);
    assert.deepEqual(result, local);
  });

  test("keeps local element when local version is higher", () => {
    const local = [{ id: "a", version: 3, text: "local" }];
    const remote = [{ id: "a", version: 2, text: "remote" }];
    const result = mergeElements(local, remote);
    assert.equal((result[0] as any).text, "local");
  });

  test("takes remote element when remote version is higher", () => {
    const local = [{ id: "a", version: 1, text: "local" }];
    const remote = [{ id: "a", version: 2, text: "remote" }];
    const result = mergeElements(local, remote);
    assert.equal((result[0] as any).text, "remote");
  });

  test("keeps local element when versions are equal", () => {
    const local = [{ id: "a", version: 2, text: "local" }];
    const remote = [{ id: "a", version: 2, text: "remote" }];
    const result = mergeElements(local, remote);
    assert.equal((result[0] as any).text, "local");
  });

  test("appends local-only elements at the end", () => {
    const local = [
      { id: "a", version: 1 },
      { id: "new-local", version: 1 },
    ];
    const remote = [{ id: "a", version: 1 }];
    const result = mergeElements(local, remote);
    assert.equal(result.length, 2);
    assert.equal((result[1] as any).id, "new-local");
  });

  test("preserves remote z-order", () => {
    const local = [
      { id: "b", version: 1 },
      { id: "a", version: 1 },
    ];
    const remote = [
      { id: "a", version: 1 },
      { id: "b", version: 1 },
    ];
    const result = mergeElements(local, remote);
    // Should follow remote order: a, b
    assert.equal((result[0] as any).id, "a");
    assert.equal((result[1] as any).id, "b");
  });

  test("skips elements without id", () => {
    const local = [{ noId: true } as any];
    const remote = [{ noId: true } as any];
    const result = mergeElements(local, remote);
    assert.equal(result.length, 0);
  });

  test("handles missing version as 0", () => {
    const local = [{ id: "a", text: "local" }];
    const remote = [{ id: "a", version: 1, text: "remote" }];
    const result = mergeElements(local, remote);
    assert.equal((result[0] as any).text, "remote");
  });

  test("complex merge scenario", () => {
    const local = [
      { id: "a", version: 3, text: "local-edited" },  // local wins (higher version)
      { id: "b", version: 1, text: "local-b" },        // remote wins (higher version)
      { id: "d", version: 1, text: "new-local" },      // local-only, appended
    ];
    const remote = [
      { id: "b", version: 2, text: "remote-b" },
      { id: "a", version: 2, text: "remote-a" },
      { id: "c", version: 1, text: "remote-only" },    // remote-only
    ];
    const result = mergeElements(local, remote);

    // Remote order: b, a, c + local-only: d
    assert.equal(result.length, 4);
    assert.equal((result[0] as any).id, "b");
    assert.equal((result[0] as any).text, "remote-b");  // remote wins
    assert.equal((result[1] as any).id, "a");
    assert.equal((result[1] as any).text, "local-edited"); // local wins
    assert.equal((result[2] as any).id, "c");
    assert.equal((result[2] as any).text, "remote-only");
    assert.equal((result[3] as any).id, "d");
    assert.equal((result[3] as any).text, "new-local");
  });
});

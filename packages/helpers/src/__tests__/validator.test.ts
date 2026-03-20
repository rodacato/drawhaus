import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateElements, normalizeElements } from "../validator.js";

describe("validateElements", () => {
  // ── Happy paths ───────────────────────────────────────────────

  it("accepts valid rectangle", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("accepts valid text", () => {
    const result = validateElements([
      { type: "text", x: 0, y: 0, text: "Hello" },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts valid arrow", () => {
    const result = validateElements([
      { type: "arrow", x: 0, y: 0, points: [[0, 0], [100, 0]] },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts valid line", () => {
    const result = validateElements([
      { type: "line", x: 0, y: 0, points: [[0, 0], [50, 50]] },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts valid diamond", () => {
    const result = validateElements([
      { type: "diamond", x: 10, y: 10, width: 50, height: 50 },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts valid ellipse", () => {
    const result = validateElements([
      { type: "ellipse", x: 10, y: 10, width: 80, height: 60 },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts empty array", () => {
    const result = validateElements([]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("accepts elements with extra fields (passthrough)", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50, customField: "ok" },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts elements with null optional fields (real Excalidraw format)", () => {
    const result = validateElements([
      {
        type: "rectangle",
        x: 100, y: 100,
        width: 200, height: 120,
        roundness: null,
        boundElements: null,
        link: null,
        frameId: null,
      },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts elements with all real Excalidraw metadata fields", () => {
    const result = validateElements([
      {
        type: "rectangle",
        id: "abc123",
        x: 100, y: 100,
        width: 200, height: 120,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "#a5d8ff",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: "a0",
        roundness: { type: 3 },
        seed: 1234567890,
        version: 42,
        versionNonce: 987654321,
        isDeleted: false,
        boundElements: [{ id: "arrow-1", type: "arrow" }],
        updated: 1710000000000,
        link: null,
        locked: false,
      },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  // ── Errors: structural problems ───────────────────────────────

  it("rejects invalid type", () => {
    const result = validateElements([
      { type: "circle", x: 0, y: 0, width: 100, height: 100 },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].message.includes("Invalid enum value"));
  });

  it("rejects missing type", () => {
    const result = validateElements([{ x: 0, y: 0 }]);
    assert.equal(result.valid, false);
  });

  it("rejects missing width on shape", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, height: 50 },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === "width"));
  });

  it("rejects missing text on text element", () => {
    const result = validateElements([{ type: "text", x: 0, y: 0 }]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === "text"));
  });

  it("rejects text exceeding max length", () => {
    const result = validateElements([
      { type: "text", x: 0, y: 0, text: "a".repeat(3000) },
    ]);
    assert.equal(result.valid, false);
  });

  it("rejects missing points on arrow", () => {
    const result = validateElements([{ type: "arrow", x: 0, y: 0 }]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === "points"));
  });

  it("rejects arrow with < 2 points", () => {
    const result = validateElements([
      { type: "arrow", x: 0, y: 0, points: [[0, 0]] },
    ]);
    assert.equal(result.valid, false);
  });

  it("rejects invalid point format", () => {
    const result = validateElements([
      { type: "arrow", x: 0, y: 0, points: [[0, 0], "bad"] },
    ]);
    assert.equal(result.valid, false);
  });

  it("rejects too many elements", () => {
    const elements = Array.from({ length: 5001 }, (_, i) => ({
      type: "rectangle",
      x: i,
      y: 0,
      width: 10,
      height: 10,
    }));
    const result = validateElements(elements);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].message.includes("Too many elements"));
  });

  it("rejects dangerous keys", () => {
    const el = Object.create(null);
    el.type = "rectangle";
    el.x = 0;
    el.y = 0;
    el.width = 10;
    el.height = 10;
    el.constructor = {};
    const result = validateElements([el]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.message.includes("Dangerous key")));
  });

  it("rejects non-object elements", () => {
    const result = validateElements(["not-an-object" as unknown]);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].message.includes("plain object"));
  });

  it("reports element id in errors", () => {
    const result = validateElements([
      { type: "rectangle", id: "my-box", x: 0, y: 0 },
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].elementId, "my-box");
  });

  // ── Warnings: valid but suspicious ────────────────────────────

  it("warns on coordinates out of range", () => {
    const result = validateElements([
      { type: "rectangle", x: 999999, y: 0, width: 100, height: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.field === "x"));
  });

  it("warns on zero-width shape", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 0, height: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.field === "width"));
  });

  it("warns on oversized dimensions", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 99999, height: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.field === "width"));
  });

  it("warns on out-of-range fontSize", () => {
    const result = validateElements([
      { type: "text", x: 0, y: 0, text: "hi", fontSize: 200 },
    ]);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.field === "fontSize"));
  });

  it("warns on out-of-range strokeWidth", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50, strokeWidth: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.field === "strokeWidth"));
  });

  // ── Graceful handling ─────────────────────────────────────────

  it("skips isDeleted elements entirely", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "rectangle", x: 0, y: 0, isDeleted: true },
      { type: "text", x: 0, y: 0, isDeleted: true },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  it("skips deleted elements even if they have invalid fields", () => {
    const result = validateElements([
      { type: "BOGUS", x: 999999, isDeleted: true },
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("validates non-deleted elements alongside deleted ones", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "rectangle", x: 0, y: 0, isDeleted: true },
      { type: "rectangle", x: 0, y: 0 },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 1);
    assert.ok(result.errors.every((e) => e.elementIndex === 2));
  });

  it("accepts freedraw with zero width (single click)", () => {
    const result = validateElements([
      { type: "freedraw", x: 100, y: 200, width: 0, height: 2.3, points: [[0, 0], [0, 2.3]] },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts freedraw with zero height", () => {
    const result = validateElements([
      { type: "freedraw", x: 10, y: 20, width: 5, height: 0, points: [[0, 0], [5, 0]] },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts image elements with dimensions", () => {
    const result = validateElements([
      { type: "image", x: 0, y: 0, width: 200, height: 150 },
    ]);
    assert.equal(result.valid, true);
  });

  it("reports errors per element without failing valid ones", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "rectangle", x: 0, y: 0 },
      { type: "text", x: 0, y: 0, text: "ok" },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 1);
    assert.ok(result.errors.every((e) => e.elementIndex === 1));
  });

  it("handles mix of valid, deleted, and warning elements", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "text", x: 0, y: 0, isDeleted: true },
      { type: "text", x: 0, y: 0, text: "hello" },
      { type: "arrow", x: 0, y: 0, isDeleted: true },
      { type: "ellipse", x: 0, y: 0, width: 80, height: 60 },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });
});

// ── normalizeElements ─────────────────────────────────────────────

describe("normalizeElements", () => {
  it("removes deleted elements", () => {
    const result = normalizeElements([
      { type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50, isDeleted: true },
      { type: "text", x: 0, y: 0, text: "hello" },
    ]);
    assert.equal(result.length, 2);
    assert.equal(result[0].type, "rectangle");
    assert.equal(result[1].type, "text");
  });

  it("strips dangerous keys", () => {
    const el = Object.create(null);
    el.type = "rectangle";
    el.x = 0;
    el.y = 0;
    el.width = 10;
    el.height = 10;
    el.constructor = {};
    const result = normalizeElements([el]);
    assert.equal(result.length, 1);
    assert.equal(Object.hasOwn(result[0], "constructor"), false);
    assert.equal(result[0].type, "rectangle");
  });

  it("skips non-object entries", () => {
    const result = normalizeElements([
      "not-an-object",
      null,
      42,
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50 },
    ] as unknown[]);
    assert.equal(result.length, 1);
  });

  it("returns empty array for non-array input", () => {
    const result = normalizeElements("bad" as unknown as unknown[]);
    assert.deepEqual(result, []);
  });

  it("preserves valid elements unchanged", () => {
    const original = { type: "rectangle", x: 10, y: 20, width: 100, height: 50, strokeColor: "#1e1e1e" };
    const result = normalizeElements([original]);
    assert.equal(result.length, 1);
    assert.equal(result[0].x, 10);
    assert.equal(result[0].strokeColor, "#1e1e1e");
  });

  it("handles all deleted → returns empty", () => {
    const result = normalizeElements([
      { type: "rectangle", x: 0, y: 0, isDeleted: true },
      { type: "text", x: 0, y: 0, isDeleted: true },
    ]);
    assert.equal(result.length, 0);
  });

  it("does not mutate original array", () => {
    const elements = [
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50 },
      { type: "text", x: 0, y: 0, isDeleted: true },
    ];
    normalizeElements(elements);
    assert.equal(elements.length, 2);
    assert.equal(elements[1].isDeleted, true);
  });

  // ── Text normalization ──────────────────────────────────────

  it("trims whitespace from text", () => {
    const result = normalizeElements([
      { type: "text", x: 0, y: 0, text: "  hello  " },
    ]);
    assert.equal(result[0].text, "hello");
  });

  it("collapses internal whitespace runs", () => {
    const result = normalizeElements([
      { type: "text", x: 0, y: 0, text: "hello    world" },
    ]);
    assert.equal(result[0].text, "hello world");
  });

  it("preserves intentional newlines in text", () => {
    const result = normalizeElements([
      { type: "text", x: 0, y: 0, text: "line 1\nline 2\nline 3" },
    ]);
    assert.equal(result[0].text, "line 1\nline 2\nline 3");
  });

  it("trims each line and strips leading/trailing blank lines", () => {
    const result = normalizeElements([
      { type: "text", x: 0, y: 0, text: "\n  hello  \n  world  \n" },
    ]);
    assert.equal(result[0].text, "hello\nworld");
  });

  // ── Point deduplication ─────────────────────────────────────

  it("deduplicates consecutive near-identical points", () => {
    const result = normalizeElements([
      {
        type: "arrow", x: 0, y: 0,
        points: [[0, 0], [0, 0.1], [0, 0.2], [100, 0]],
      },
    ]);
    const points = result[0].points as number[][];
    assert.equal(points.length, 2);
    assert.deepEqual(points[0], [0, 0]);
    assert.deepEqual(points[1], [100, 0]);
  });

  it("always keeps first and last points", () => {
    const result = normalizeElements([
      {
        type: "line", x: 0, y: 0,
        points: [[0, 0], [0.1, 0.1], [0.2, 0.2]],
      },
    ]);
    const points = result[0].points as number[][];
    assert.ok(points.length >= 2);
    assert.deepEqual(points[0], [0, 0]);
    assert.deepEqual(points[points.length - 1], [0.2, 0.2]);
  });

  it("preserves distinct points", () => {
    const result = normalizeElements([
      {
        type: "arrow", x: 0, y: 0,
        points: [[0, 0], [50, 0], [50, 100], [100, 100]],
      },
    ]);
    const points = result[0].points as number[][];
    assert.equal(points.length, 4);
  });

  it("does not dedup when only 2 points", () => {
    const result = normalizeElements([
      {
        type: "arrow", x: 0, y: 0,
        points: [[0, 0], [100, 0]],
      },
    ]);
    const points = result[0].points as number[][];
    assert.equal(points.length, 2);
  });
});

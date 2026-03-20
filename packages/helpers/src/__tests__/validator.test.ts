import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateElements } from "../validator.js";

describe("validateElements", () => {
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

  it("rejects coordinates out of range", () => {
    const result = validateElements([
      { type: "rectangle", x: 999999, y: 0, width: 100, height: 50 },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === "x"));
  });

  it("rejects missing width on shape", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, height: 50 },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.field === "width"));
  });

  it("rejects zero-width shape", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 0, height: 50 },
    ]);
    assert.equal(result.valid, false);
  });

  it("rejects oversized dimensions", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 99999, height: 50 },
    ]);
    assert.equal(result.valid, false);
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
    const elements = Array.from({ length: 501 }, (_, i) => ({
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
    // __proto__ is silently dropped by JS engine in object literals,
    // so we use Object.create to inject it
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

  it("warns on out-of-range fontSize", () => {
    const result = validateElements([
      { type: "text", x: 0, y: 0, text: "hi", fontSize: 200 },
    ]);
    assert.equal(result.valid, true); // warning, not error
    assert.ok(result.warnings.some((w) => w.field === "fontSize"));
  });

  it("warns on out-of-range strokeWidth", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50, strokeWidth: 50 },
    ]);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.field === "strokeWidth"));
  });

  it("accepts empty array", () => {
    const result = validateElements([]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("reports element id in errors", () => {
    const result = validateElements([
      { type: "rectangle", id: "my-box", x: 0, y: 0 },
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].elementId, "my-box");
  });

  it("rejects non-object elements", () => {
    const result = validateElements(["not-an-object" as unknown]);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].message.includes("plain object"));
  });

  it("accepts elements with extra fields (passthrough)", () => {
    const result = validateElements([
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50, customField: "ok" },
    ]);
    assert.equal(result.valid, true);
  });
});

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createRect,
  createText,
  createArrow,
  createLine,
  createDiamond,
  createEllipse,
  resetIdCounter,
} from "../elements.js";

beforeEach(() => {
  resetIdCounter();
});

describe("createRect", () => {
  it("creates a rectangle with defaults", () => {
    const rect = createRect({ x: 10, y: 20, width: 100, height: 50 });
    assert.equal(rect.type, "rectangle");
    assert.equal(rect.x, 10);
    assert.equal(rect.y, 20);
    assert.equal(rect.width, 100);
    assert.equal(rect.height, 50);
    assert.equal(rect.strokeColor, "#1e1e1e");
    assert.equal(rect.backgroundColor, "transparent");
    assert.equal(rect.fillStyle, "solid");
    assert.equal(rect.strokeWidth, 2);
    assert.equal(rect.roughness, 1);
    assert.equal(rect.opacity, 100);
    assert.equal(rect.roundness, null);
    assert.ok(rect.id.startsWith("rect_"));
  });

  it("accepts custom id", () => {
    const rect = createRect({ id: "my-rect", x: 0, y: 0, width: 50, height: 50 });
    assert.equal(rect.id, "my-rect");
  });

  it("creates label when provided", () => {
    const rect = createRect({ x: 10, y: 20, width: 100, height: 50, label: "Hello" });
    assert.deepEqual(rect.label, { text: "Hello", x: 10, y: 20 });
  });

  it("applies roundness", () => {
    const rect = createRect({ x: 0, y: 0, width: 100, height: 50, roundness: 8 });
    assert.deepEqual(rect.roundness, { type: 3, value: 8 });
  });

  it("accepts custom styles", () => {
    const rect = createRect({
      x: 0, y: 0, width: 100, height: 50,
      backgroundColor: "#a5d8ff",
      strokeStyle: "dashed",
      fillStyle: "hachure",
    });
    assert.equal(rect.backgroundColor, "#a5d8ff");
    assert.equal(rect.strokeStyle, "dashed");
    assert.equal(rect.fillStyle, "hachure");
  });
});

describe("createText", () => {
  it("creates text with defaults", () => {
    const text = createText({ x: 10, y: 20, text: "Hello" });
    assert.equal(text.type, "text");
    assert.equal(text.text, "Hello");
    assert.equal(text.fontSize, 16);
    assert.equal(text.fontFamily, 1);
    assert.equal(text.textAlign, "left");
    assert.ok(text.id.startsWith("text_"));
  });

  it("accepts custom font settings", () => {
    const text = createText({ x: 0, y: 0, text: "Code", fontSize: 14, fontFamily: 3, textAlign: "center" });
    assert.equal(text.fontSize, 14);
    assert.equal(text.fontFamily, 3);
    assert.equal(text.textAlign, "center");
  });
});

describe("createArrow", () => {
  it("creates arrow with relative points", () => {
    const arrow = createArrow({
      points: [{ x: 100, y: 200 }, { x: 300, y: 200 }],
    });
    assert.equal(arrow.type, "arrow");
    assert.equal(arrow.x, 100);
    assert.equal(arrow.y, 200);
    assert.deepEqual(arrow.points, [[0, 0], [200, 0]]);
    assert.equal(arrow.startArrowhead, null);
    assert.equal(arrow.endArrowhead, "arrow");
  });

  it("adds label at midpoint", () => {
    const arrow = createArrow({
      points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }],
      label: "FK",
    });
    // midIdx = floor(3/2) = 1 → midPoint is {x:200, y:0}
    assert.deepEqual(arrow.label, { text: "FK", x: 200, y: 0 });
  });

  it("supports bindings", () => {
    const arrow = createArrow({
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      startBinding: { elementId: "rect-1" },
      endBinding: { elementId: "rect-2" },
    });
    assert.deepEqual(arrow.startBinding, { elementId: "rect-1", focus: 0, gap: 5 });
    assert.deepEqual(arrow.endBinding, { elementId: "rect-2", focus: 0, gap: 5 });
  });

  it("supports custom arrowheads", () => {
    const arrow = createArrow({
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      startArrowhead: "diamond",
      endArrowhead: "triangle",
      strokeStyle: "dashed",
    });
    assert.equal(arrow.startArrowhead, "diamond");
    assert.equal(arrow.endArrowhead, "triangle");
    assert.equal(arrow.strokeStyle, "dashed");
  });
});

describe("createLine", () => {
  it("creates line with correct points", () => {
    const line = createLine({ startX: 10, startY: 20, endX: 110, endY: 20 });
    assert.equal(line.type, "line");
    assert.equal(line.x, 10);
    assert.equal(line.y, 20);
    assert.deepEqual(line.points, [[0, 0], [100, 0]]);
  });
});

describe("createDiamond", () => {
  it("creates diamond with defaults", () => {
    const d = createDiamond({ x: 50, y: 50, width: 80, height: 80 });
    assert.equal(d.type, "diamond");
    assert.equal(d.width, 80);
  });

  it("creates label", () => {
    const d = createDiamond({ x: 50, y: 50, width: 80, height: 80, label: "?" });
    assert.deepEqual(d.label, { text: "?", x: 50, y: 50 });
  });
});

describe("createEllipse", () => {
  it("creates ellipse with defaults", () => {
    const e = createEllipse({ x: 50, y: 50, width: 100, height: 60 });
    assert.equal(e.type, "ellipse");
    assert.equal(e.width, 100);
    assert.equal(e.height, 60);
  });
});

describe("unique IDs", () => {
  it("generates unique ids across builders", () => {
    const r = createRect({ x: 0, y: 0, width: 10, height: 10 });
    const t = createText({ x: 0, y: 0, text: "hi" });
    const a = createArrow({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] });
    assert.notEqual(r.id, t.id);
    assert.notEqual(t.id, a.id);
  });
});

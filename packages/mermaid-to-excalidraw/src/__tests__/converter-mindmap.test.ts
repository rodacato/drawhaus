import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertMindmap } from "../converter/mindmap.js";

describe("convertMindmap", () => {
  it("converts simple mindmap to elements", async () => {
    const result = await convertMindmap(`mindmap
  Root
    Child A
    Child B`);

    assert.equal(result.diagramType, "mindmap");
    assert.ok(result.elements.length > 0);
  });

  it("renders root with root theme", async () => {
    const result = await convertMindmap(`mindmap
  Root
    Child`);

    // Root should have mindmapRoot background
    const rootElements = result.elements.filter(
      (e) => (e.type === "rectangle" || e.type === "ellipse") && e.backgroundColor === "#e8eef6",
    );
    assert.ok(rootElements.length >= 1, "Should have root with root theme color");
  });

  it("renders leaf nodes with leaf theme", async () => {
    const result = await convertMindmap(`mindmap
  Root
    Leaf`);

    // Leaf should have mindmapLeaf color
    const leafElements = result.elements.filter(
      (e) => (e.type === "rectangle" || e.type === "ellipse") && e.strokeColor === "#6da670",
    );
    assert.ok(leafElements.length >= 1, "Should have leaf with leaf theme color");
  });

  it("renders branch lines", async () => {
    const result = await convertMindmap(`mindmap
  Root
    Child A
    Child B`);

    const lines = result.elements.filter((e) => e.type === "line");
    assert.equal(lines.length, 2, "Should have 2 branch lines (root->A, root->B)");
  });

  it("renders circle shape as ellipse", async () => {
    const result = await convertMindmap(`mindmap
  ((Project))
    Child`);

    const ellipses = result.elements.filter((e) => e.type === "ellipse");
    assert.ok(ellipses.length >= 1, "Root should be an ellipse");
  });

  it("renders square shape as rectangle", async () => {
    const result = await convertMindmap(`mindmap
  Root
    [Square Node]`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length >= 2, "Should have root + square child rectangles");
  });

  it("renders hexagon shape as diamond", async () => {
    const result = await convertMindmap(`mindmap
  Root
    {{Hexagon}}`);

    const diamonds = result.elements.filter((e) => e.type === "diamond");
    assert.ok(diamonds.length >= 1, "Should have hexagon as diamond");
  });

  it("handles deep nesting", async () => {
    const result = await convertMindmap(`mindmap
  Root
    A
      B
        C
          D`);

    assert.ok(result.elements.length > 0);
    const lines = result.elements.filter((e) => e.type === "line");
    assert.equal(lines.length, 4, "Should have 4 branch lines for chain");
  });

  it("handles empty mindmap", async () => {
    const result = await convertMindmap(`mindmap`);
    assert.equal(result.elements.length, 0);
  });

  it("converts playground Project Brainstorm without errors", async () => {
    const result = await convertMindmap(`mindmap
  root((Project))
    Frontend
      React
      TypeScript
      Tailwind
    Backend
      Node.js
      PostgreSQL
      Redis
    DevOps
      Docker
      CI/CD
      Monitoring`);

    assert.ok(result.elements.length > 0);
    assert.equal(result.diagramType, "mindmap");

    // 13 nodes total (1 root + 3 categories + 9 leaves)
    const shapes = result.elements.filter(
      (e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond",
    );
    assert.equal(shapes.length, 13, "Should have 13 node shapes");

    // 12 branch lines (root->3 + 3*3)
    const lines = result.elements.filter((e) => e.type === "line");
    assert.equal(lines.length, 12, "Should have 12 branch lines");
  });
});

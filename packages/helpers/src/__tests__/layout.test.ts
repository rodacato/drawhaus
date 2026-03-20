import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { layoutGraph } from "../layout.js";

describe("layoutGraph", () => {
  it("positions nodes without overlap", () => {
    const nodes = [
      { id: "A", width: 100, height: 50 },
      { id: "B", width: 100, height: 50 },
    ];
    const edges = [{ source: "A", target: "B" }];

    const result = layoutGraph(nodes, edges);

    const posA = result.nodes.get("A")!;
    const posB = result.nodes.get("B")!;

    assert.ok(posA, "Node A should have a position");
    assert.ok(posB, "Node B should have a position");

    // B should be below A in TB layout
    assert.ok(posB.y > posA.y + posA.height, "B should be below A");
    assert.equal(posA.width, 100);
    assert.equal(posA.height, 50);
  });

  it("produces edge positions", () => {
    const nodes = [
      { id: "A", width: 100, height: 50 },
      { id: "B", width: 100, height: 50 },
    ];
    const edges = [{ source: "A", target: "B", id: "e1" }];

    const result = layoutGraph(nodes, edges);

    const edgePos = result.edges.get("e1");
    assert.ok(edgePos, "Edge e1 should have a position");
    assert.ok(edgePos.points.length >= 2, "Edge should have at least 2 points");
  });

  it("supports LR direction", () => {
    const nodes = [
      { id: "A", width: 100, height: 50 },
      { id: "B", width: 100, height: 50 },
    ];
    const edges = [{ source: "A", target: "B" }];

    const result = layoutGraph(nodes, edges, "LR");

    const posA = result.nodes.get("A")!;
    const posB = result.nodes.get("B")!;

    // B should be to the right of A in LR layout
    assert.ok(posB.x > posA.x + posA.width, "B should be to the right of A");
  });

  it("handles nodes without edges", () => {
    const nodes = [
      { id: "A", width: 100, height: 50 },
      { id: "B", width: 100, height: 50 },
    ];

    const result = layoutGraph(nodes, []);

    assert.ok(result.nodes.get("A"), "Node A should have a position");
    assert.ok(result.nodes.get("B"), "Node B should have a position");
  });

  it("respects custom spacing", () => {
    const nodes = [
      { id: "A", width: 100, height: 50 },
      { id: "B", width: 100, height: 50 },
    ];
    const edges = [{ source: "A", target: "B" }];

    const tight = layoutGraph(nodes, edges, "TB", 20, 40);
    const wide = layoutGraph(nodes, edges, "TB", 200, 300);

    const tightGap = tight.nodes.get("B")!.y - (tight.nodes.get("A")!.y + tight.nodes.get("A")!.height);
    const wideGap = wide.nodes.get("B")!.y - (wide.nodes.get("A")!.y + wide.nodes.get("A")!.height);

    assert.ok(wideGap > tightGap, "Wider spacing should produce larger gaps");
  });

  it("handles complex graphs", () => {
    const nodes = [
      { id: "A", width: 100, height: 50 },
      { id: "B", width: 120, height: 60 },
      { id: "C", width: 80, height: 40 },
      { id: "D", width: 100, height: 50 },
    ];
    const edges = [
      { source: "A", target: "B", id: "e1" },
      { source: "A", target: "C", id: "e2" },
      { source: "B", target: "D", id: "e3" },
      { source: "C", target: "D", id: "e4" },
    ];

    const result = layoutGraph(nodes, edges);

    assert.equal(result.nodes.size, 4);
    assert.equal(result.edges.size, 4);

    // No overlapping nodes
    const positions = Array.from(result.nodes.values());
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        assert.ok(!overlaps, `Nodes ${i} and ${j} should not overlap`);
      }
    }
  });
});

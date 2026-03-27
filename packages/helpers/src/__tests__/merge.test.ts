import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeElements, mergeDelta, diffElements } from "../merge.js";

describe("mergeElements", () => {
  it("keeps higher-version local element", () => {
    const local = [{ id: "a", type: "rectangle", version: 3 }];
    const remote = [{ id: "a", type: "rectangle", version: 2 }];
    const result = mergeElements(local, remote) as Array<{ id: string; version: number }>;
    assert.equal(result.length, 1);
    assert.equal(result[0].version, 3);
  });

  it("accepts higher-version remote element", () => {
    const local = [{ id: "a", type: "rectangle", version: 1 }];
    const remote = [{ id: "a", type: "rectangle", version: 5 }];
    const result = mergeElements(local, remote) as Array<{ id: string; version: number }>;
    assert.equal(result[0].version, 5);
  });

  it("appends local-only elements", () => {
    const local = [{ id: "a", type: "rectangle", version: 1 }, { id: "b", type: "ellipse", version: 1 }];
    const remote = [{ id: "a", type: "rectangle", version: 1 }];
    const result = mergeElements(local, remote) as Array<{ id: string }>;
    assert.equal(result.length, 2);
    assert.equal(result[1].id, "b");
  });

  it("preserves remote z-order", () => {
    const local = [{ id: "b", type: "rectangle", version: 1 }, { id: "a", type: "rectangle", version: 1 }];
    const remote = [{ id: "a", type: "rectangle", version: 1 }, { id: "b", type: "rectangle", version: 1 }];
    const result = mergeElements(local, remote) as Array<{ id: string }>;
    assert.equal(result[0].id, "a");
    assert.equal(result[1].id, "b");
  });
});

describe("diffElements", () => {
  it("detects changed elements", () => {
    const prev = [{ id: "a", type: "rectangle", version: 1 }];
    const current = [{ id: "a", type: "rectangle", version: 2 }];
    const delta = diffElements(prev, current);
    assert.equal(delta.changed.length, 1);
    assert.equal(delta.removedIds.length, 0);
  });

  it("detects new elements", () => {
    const prev = [{ id: "a", type: "rectangle", version: 1 }];
    const current = [{ id: "a", type: "rectangle", version: 1 }, { id: "b", type: "ellipse", version: 1 }];
    const delta = diffElements(prev, current);
    assert.equal(delta.changed.length, 1);
    assert.equal(delta.changed[0].id, "b");
  });

  it("detects removed elements", () => {
    const prev = [{ id: "a", type: "rectangle", version: 1 }, { id: "b", type: "ellipse", version: 1 }];
    const current = [{ id: "a", type: "rectangle", version: 1 }];
    const delta = diffElements(prev, current);
    assert.deepEqual(delta.removedIds, ["b"]);
  });

  it("returns empty delta when nothing changed", () => {
    const prev = [{ id: "a", type: "rectangle", version: 1 }];
    const current = [{ id: "a", type: "rectangle", version: 1 }];
    const delta = diffElements(prev, current);
    assert.equal(delta.changed.length, 0);
    assert.equal(delta.removedIds.length, 0);
  });
});

describe("mergeDelta", () => {
  it("applies changed elements with higher version", () => {
    const local = [{ id: "a", type: "rectangle", version: 1, x: 0, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null }];
    const changed = [{ id: "a", type: "rectangle", version: 3, x: 50, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null }];
    const { elements, conflictIds } = mergeDelta(local, changed, []);
    assert.equal(elements.length, 1);
    assert.equal((elements[0] as { x: number }).x, 50);
    assert.equal(conflictIds.length, 1);
  });

  it("keeps local element when version is higher", () => {
    const local = [{ id: "a", type: "rectangle", version: 5, x: 0, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null }];
    const changed = [{ id: "a", type: "rectangle", version: 2, x: 50, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null }];
    const { elements, conflictIds } = mergeDelta(local, changed, []);
    assert.equal((elements[0] as { x: number }).x, 0);
    assert.equal(conflictIds.length, 0);
  });

  it("delete wins over version", () => {
    const local = [
      { id: "a", type: "rectangle", version: 10, x: 0, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null },
      { id: "b", type: "ellipse", version: 1, x: 0, y: 0, width: 50, height: 50, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null },
    ];
    const { elements, deletedIds } = mergeDelta(local, [], ["a"]);
    assert.equal(elements.length, 1);
    assert.equal(elements[0].id, "b");
    assert.deepEqual(deletedIds, ["a"]);
  });

  it("adds new remote elements", () => {
    const local = [{ id: "a", type: "rectangle", version: 1, x: 0, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null }];
    const changed = [{ id: "b", type: "ellipse", version: 1, x: 0, y: 0, width: 50, height: 50, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null }];
    const { elements } = mergeDelta(local, changed, []);
    assert.equal(elements.length, 2);
  });

  it("cleans up orphaned arrow bindings after delete", () => {
    const local = [
      { id: "rect1", type: "rectangle", version: 1, x: 0, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null },
      { id: "arrow1", type: "arrow", version: 1, x: 0, y: 0, width: 200, height: 0, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null, startBinding: { elementId: "rect1", focus: 0, gap: 5 }, endBinding: { elementId: "rect2", focus: 0, gap: 5 } },
      { id: "rect2", type: "rectangle", version: 1, x: 200, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null },
    ];
    // Delete rect1 — arrow's startBinding should be cleaned up
    const { elements } = mergeDelta(local, [], ["rect1"]);
    const arrow = elements.find((e) => e.id === "arrow1") as { startBinding?: unknown; endBinding?: unknown };
    assert.equal(arrow.startBinding, undefined);
    assert.ok(arrow.endBinding); // rect2 still exists
  });

  it("cleans up orphaned groupIds after delete", () => {
    const local = [
      { id: "a", type: "rectangle", version: 1, x: 0, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null, groupIds: ["g1"] },
      { id: "b", type: "rectangle", version: 1, x: 100, y: 0, width: 100, height: 100, strokeColor: "#000", backgroundColor: "transparent", fillStyle: "solid" as const, strokeWidth: 1, strokeStyle: "solid" as const, roughness: 1, opacity: 100, roundness: null, groupIds: ["g1"] },
    ];
    // Delete b — group g1 now has only 1 member, so it should be cleaned up
    const { elements } = mergeDelta(local, [], ["b"]);
    assert.equal(elements.length, 1);
    const remaining = elements[0] as { groupIds?: string[] };
    assert.deepEqual(remaining.groupIds, []);
  });
});

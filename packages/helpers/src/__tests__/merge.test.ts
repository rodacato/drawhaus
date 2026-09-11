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
    const local = [
      { id: "a", type: "rectangle", version: 1 },
      { id: "b", type: "ellipse", version: 1 },
    ];
    const remote = [{ id: "a", type: "rectangle", version: 1 }];
    const result = mergeElements(local, remote) as Array<{ id: string }>;
    assert.equal(result.length, 2);
    assert.equal(result[1].id, "b");
  });

  it("preserves remote z-order", () => {
    const local = [
      { id: "b", type: "rectangle", version: 1 },
      { id: "a", type: "rectangle", version: 1 },
    ];
    const remote = [
      { id: "a", type: "rectangle", version: 1 },
      { id: "b", type: "rectangle", version: 1 },
    ];
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
    const current = [
      { id: "a", type: "rectangle", version: 1 },
      { id: "b", type: "ellipse", version: 1 },
    ];
    const delta = diffElements(prev, current);
    assert.equal(delta.changed.length, 1);
    assert.equal(delta.changed[0].id, "b");
  });

  it("detects removed elements", () => {
    const prev = [
      { id: "a", type: "rectangle", version: 1 },
      { id: "b", type: "ellipse", version: 1 },
    ];
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
    const local = [
      {
        id: "a",
        type: "rectangle",
        version: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const changed = [
      {
        id: "a",
        type: "rectangle",
        version: 3,
        x: 50,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const { elements, conflictIds } = mergeDelta(local, changed, []);
    assert.equal(elements.length, 1);
    assert.equal((elements[0] as { x: number }).x, 50);
    assert.deepEqual(conflictIds, [], "nothing was edited here, so no edit was lost");
  });

  it("reports a conflict when a remote copy replaces an element edited here", () => {
    const { conflictIds } = mergeDelta([el("a", 4)], [el("a", 6)], [], new Set(["a"]));
    assert.deepEqual(conflictIds, ["a"]);
  });

  it("an edited element that survives, or an identical copy, is no conflict", () => {
    const edited = new Set(["a"]);
    assert.deepEqual(mergeDelta([el("a", 6)], [el("a", 4)], [], edited).conflictIds, []);
    assert.deepEqual(mergeDelta([el("a", 6)], [el("a", 6)], [], edited).conflictIds, []);
  });

  it("keeps local element when version is higher", () => {
    const local = [
      {
        id: "a",
        type: "rectangle",
        version: 5,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const changed = [
      {
        id: "a",
        type: "rectangle",
        version: 2,
        x: 50,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const { elements, conflictIds } = mergeDelta(local, changed, []);
    assert.equal((elements[0] as { x: number }).x, 0);
    assert.equal(conflictIds.length, 0);
  });

  it("delete wins over version", () => {
    const local = [
      {
        id: "a",
        type: "rectangle",
        version: 10,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
      {
        id: "b",
        type: "ellipse",
        version: 1,
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const { elements, deletedIds } = mergeDelta(local, [], ["a"]);
    assert.equal(elements.length, 1);
    assert.equal(elements[0].id, "b");
    assert.deepEqual(deletedIds, ["a"]);
  });

  it("adds new remote elements", () => {
    const local = [
      {
        id: "a",
        type: "rectangle",
        version: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const changed = [
      {
        id: "b",
        type: "ellipse",
        version: 1,
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    const { elements } = mergeDelta(local, changed, []);
    assert.equal(elements.length, 2);
  });

  it("cleans up orphaned arrow bindings after delete", () => {
    const local = [
      {
        id: "rect1",
        type: "rectangle",
        version: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
      {
        id: "arrow1",
        type: "arrow",
        version: 1,
        x: 0,
        y: 0,
        width: 200,
        height: 0,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
        startBinding: { elementId: "rect1", focus: 0, gap: 5 },
        endBinding: { elementId: "rect2", focus: 0, gap: 5 },
      },
      {
        id: "rect2",
        type: "rectangle",
        version: 1,
        x: 200,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
      },
    ];
    // Delete rect1 — arrow's startBinding should be cleaned up
    const { elements } = mergeDelta(local, [], ["rect1"]);
    const arrow = elements.find((e) => e.id === "arrow1") as {
      startBinding?: unknown;
      endBinding?: unknown;
    };
    assert.equal(arrow.startBinding, undefined);
    assert.ok(arrow.endBinding); // rect2 still exists
  });

  it("cleans up orphaned groupIds after delete", () => {
    const local = [
      {
        id: "a",
        type: "rectangle",
        version: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
        groupIds: ["g1"],
      },
      {
        id: "b",
        type: "rectangle",
        version: 1,
        x: 100,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: "#000",
        backgroundColor: "transparent",
        fillStyle: "solid" as const,
        strokeWidth: 1,
        strokeStyle: "solid" as const,
        roughness: 1,
        opacity: 100,
        roundness: null,
        groupIds: ["g1"],
      },
    ];
    // Delete b — group g1 now has only 1 member, so it should be cleaned up
    const { elements } = mergeDelta(local, [], ["b"]);
    assert.equal(elements.length, 1);
    const remaining = elements[0] as { groupIds?: string[] };
    assert.deepEqual(remaining.groupIds, []);
  });
});

const el = (id: string, version: number, extra: Record<string, unknown> = {}) => ({
  id,
  type: "rectangle",
  version,
  versionNonce: 0,
  ...extra,
});

const label = (elements: unknown[]) =>
  (elements as { id: string; version: number }[]).map((e) => `${e.id}@${e.version}`);

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

describe("replicas settle on the same copy", () => {
  it("on equal versions both sides keep the copy with the lower versionNonce", () => {
    const low = el("x", 3, { versionNonce: 10, x: 1 });
    const high = el("x", 3, { versionNonce: 20, x: 2 });

    assert.deepEqual(mergeElements([low], [high]), [low]);
    assert.deepEqual(mergeElements([high], [low]), [low]);
    assert.deepEqual(mergeDelta([low], [high], []).elements, [low]);
    assert.deepEqual(mergeDelta([high], [low], []).elements, [low]);
  });

  it("a higher version wins however high its nonce", () => {
    const older = el("x", 2, { versionNonce: 1 });
    const newer = el("x", 3, { versionNonce: 999 });

    assert.deepEqual(mergeElements([older], [newer]), [newer]);
    assert.deepEqual(mergeElements([newer], [older]), [newer]);
    assert.deepEqual(mergeDelta([newer], [older], []).elements, [newer]);
  });

  it("replicas that apply the same updates in any order end up identical", () => {
    const updates = [
      [el("a", 2, { versionNonce: 50, index: "a0" })],
      [el("a", 2, { versionNonce: 7, index: "a2" }), el("b", 1, { versionNonce: 3, index: "a1" })],
      [el("b", 4, { versionNonce: 9, index: "a3" }), el("c", 1, { versionNonce: 1, index: "a1" })],
      [el("a", 1, { versionNonce: 0, index: "a0" }), el("c", 1, { versionNonce: 4, index: "a4" })],
    ];

    const viaFullScenes = permutations(updates).map((order) =>
      order.reduce<unknown[]>((scene, update) => mergeElements(scene, update), []),
    );
    const viaDeltas = permutations(updates).map((order) =>
      order.reduce<unknown[]>((scene, update) => mergeDelta(scene, update, []).elements, []),
    );

    for (const replica of [...viaFullScenes, ...viaDeltas]) {
      assert.deepEqual(replica, viaFullScenes[0]);
    }
    assert.deepEqual(label(viaFullScenes[0]), ["c@1", "a@2", "b@4"]);
  });

  it("orders by fractional index, then id, once every element has one", () => {
    const local = [el("b", 1, { index: "a1" })];
    const remote = [el("a", 1, { index: "a1" }), el("c", 1, { index: "a0" })];

    assert.deepEqual(label(mergeElements(local, remote)), ["c@1", "a@1", "b@1"]);
  });
});

describe("mergeDelta cleanup", () => {
  it("returns cleaned copies one version up and leaves the local elements untouched", () => {
    const rect = el("rect1", 1, { groupIds: ["g1"] });
    const arrow = el("arrow1", 4, {
      startBinding: { elementId: "rect1", focus: 0, gap: 5 },
      groupIds: ["g1"],
    });
    const bystander = el("other", 2);
    const local = [rect, arrow, bystander];
    const before = structuredClone(local);

    const { elements } = mergeDelta(local, [], ["rect1"]);

    assert.deepEqual(local, before);
    const cleaned = elements.find((e) => (e as { id: string }).id === "arrow1") as Record<
      string,
      unknown
    >;
    assert.notEqual(cleaned, arrow);
    assert.equal(cleaned.version, 5);
    assert.equal(cleaned.startBinding, undefined);
    assert.deepEqual(cleaned.groupIds, []);
    assert.equal(
      elements.find((e) => (e as { id: string }).id === "other"),
      bystander,
      "an element with nothing to clean is passed through as is",
    );
  });
});

describe("a delete wins over a concurrent edit", () => {
  const live = (version: number) => el("dragged", version, { versionNonce: 5 });
  const tombstone = (version: number) =>
    el("dragged", version, { versionNonce: 5, isDeleted: true });
  const beingDragged = new Set(["dragged"]);
  const versionOf = (elements: unknown[]) => (elements[0] as { version: number }).version;
  const deleted = (elements: unknown[]) => (elements[0] as { isDeleted?: boolean }).isDeleted;

  it("takes the delete even when the local edit has the higher version, bumped past both", () => {
    const { elements, deletedIds } = mergeDelta([live(9)], [tombstone(5)], [], beingDragged);

    assert.equal(deleted(elements), true);
    assert.equal(versionOf(elements), 10, "so the deleter's replica settles on it too");
    assert.deepEqual(deletedIds, ["dragged"]);
  });

  it("keeps the delete as sent when it already outranks the local edit", () => {
    const { elements } = mergeDelta([live(4)], [tombstone(5)], [], beingDragged);

    assert.equal(deleted(elements), true);
    assert.equal(versionOf(elements), 5);
  });

  it("does not override an undo that brought the element back", () => {
    const { elements, deletedIds } = mergeDelta([tombstone(5)], [live(6)], [], beingDragged);

    assert.equal(deleted(elements), undefined);
    assert.deepEqual(deletedIds, []);
  });

  it("leaves an element nobody here was editing to the version rule", () => {
    const { elements } = mergeDelta([live(9)], [tombstone(5)], [], new Set());

    assert.equal(deleted(elements), undefined);
    assert.equal(versionOf(elements), 9);
  });
});

import { describe, test, expect } from "vitest";
import { SceneSync } from "../lib/scene-sync";

const el = (id: string, version: number) => ({ id, version });

describe("SceneSync", () => {
  test("before the server's scene arrives nothing counts as a local edit", () => {
    const sync = new SceneSync();
    const cached = [el("a", 1)];

    expect(sync.hasChanges(cached)).toBe(false);
    expect(sync.takeChanges(cached)).toEqual({ changed: [], removedIds: [] });
    expect(sync.editedIds(cached)).toEqual(new Set());
  });

  test("the server's scene and a teammate's copies are not local changes", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)]);
    sync.markShared([el("b", 4)]);

    expect(sync.hasChanges([el("a", 1), el("b", 4)])).toBe(false);
  });

  test("a local change is taken once, then waits for a save", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)]);
    const scene = [el("a", 2), el("new", 1)];

    expect(sync.takeChanges(scene).changed).toEqual(scene);
    expect(sync.takeChanges(scene).changed).toEqual([]);
    expect(sync.editedIds(scene)).toEqual(new Set(["a", "new"]));

    sync.markSaved();
    expect(sync.hasUnsaved()).toBe(false);
    expect(sync.editedIds(scene)).toEqual(new Set());
  });

  test("an element mutated in place after it was sent is sent again", () => {
    const sync = new SceneSync();
    sync.reset([]);
    const rect = el("rect", 1);
    sync.takeChanges([rect]);

    rect.version = 7;

    expect(sync.hasChanges([rect])).toBe(true);
    expect(sync.takeChanges([rect]).changed).toEqual([{ id: "rect", version: 7 }]);
  });

  test("an element that disappeared is reported once as removed", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1), el("b", 1)]);

    expect(sync.takeChanges([el("a", 1)])).toEqual({ changed: [], removedIds: ["b"] });
    expect(sync.hasChanges([el("a", 1)])).toBe(false);
  });

  test("a scene from another revision replaces this baseline, the same revision does not", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)], 4);

    expect(sync.isReplacedBy(5)).toBe(true);
    expect(sync.isReplacedBy(4)).toBe(false);
    expect(sync.isReplacedBy(null)).toBe(false);
  });

  test("payloads computed on an older revision are stale, later ones are not", () => {
    const sync = new SceneSync();
    sync.reset([], 4);

    expect(sync.isStale(3)).toBe(true);
    expect(sync.isStale(4)).toBe(false);
    expect(sync.isStale(undefined)).toBe(false);
  });

  test("with no known revision nothing is stale or replaced", () => {
    const sync = new SceneSync();
    expect(sync.isStale(3)).toBe(false);

    sync.reset([], 4);
    sync.forgetRevision();

    expect(sync.revision).toBeNull();
    expect(sync.isStale(3)).toBe(false);
    expect(sync.isReplacedBy(9)).toBe(false);
  });

  test("a failed save puts its edits back, without clearing marks added since", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)]);
    sync.takeChanges([el("a", 2)]);
    const mark = sync.markSaved();
    sync.takeChanges([el("a", 2), el("b", 1)]);

    sync.restoreUnsaved(mark);

    expect(sync.editedIds([el("a", 2), el("b", 1)])).toEqual(new Set(["a", "b"]));
  });

  test("a save that succeeded is not put back — nothing calls restoreUnsaved", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)]);
    sync.takeChanges([el("a", 2)]);
    sync.markSaved();

    expect(sync.hasUnsaved()).toBe(false);
  });

  test("a replace between the save and its refusal beats the rollback", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)], 1);
    sync.takeChanges([el("a", 2)]);
    const mark = sync.markSaved();

    sync.reset([el("a", 9)], 2);
    sync.restoreUnsaved(mark);

    expect(sync.hasUnsaved()).toBe(false);
  });

  test("a new server scene drops edits it replaced", () => {
    const sync = new SceneSync();
    sync.reset([el("a", 1)]);
    sync.takeChanges([el("a", 2)]);

    sync.reset([el("a", 5)]);

    expect(sync.hasUnsaved()).toBe(false);
    expect(sync.hasChanges([el("a", 5)])).toBe(false);
  });
});

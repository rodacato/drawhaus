import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

describe("SaveSceneUseCase", () => {
  it("persists elements and appState into a scene of the diagram", async () => {
    const scenes = new InMemorySceneRepository();
    const saveScene = new SaveSceneUseCase(
      scenes,
      new InMemoryDiagramRepository(),
      new InMemoryShareRepository(),
    );

    const scene = await scenes.create({
      diagramId: "diagram-1",
      name: "Scene 1",
      sortOrder: 0,
    });

    const elements = [{ id: "el1", type: "rectangle" }];
    const appState = { zoom: 1.5 };

    await saveScene.execute("diagram-1", scene.id, elements, appState);

    const updated = await scenes.findById(scene.id);
    assert.deepEqual(updated!.elements, elements);
    assert.deepEqual(updated!.appState, appState);
  });

  it("refuses a scene of another diagram and leaves it untouched", async () => {
    const scenes = new InMemorySceneRepository();
    const saveScene = new SaveSceneUseCase(
      scenes,
      new InMemoryDiagramRepository(),
      new InMemoryShareRepository(),
    );

    const foreign = await scenes.create({
      diagramId: "victim-diagram",
      name: "Scene 1",
      sortOrder: 0,
      elements: [{ id: "keep", version: 1 }],
      appState: { zoom: 2 },
    });

    await assert.rejects(
      () => saveScene.execute("attacker-diagram", foreign.id, [{ id: "evil", version: 1 }], {}),
      (err: unknown) => err instanceof NotFoundError,
    );

    const untouched = await scenes.findById(foreign.id);
    assert.deepEqual(untouched!.elements, [{ id: "keep", version: 1 }]);
    assert.deepEqual(untouched!.appState, { zoom: 2 });
  });

  it("refuses an unknown scene", async () => {
    const saveScene = new SaveSceneUseCase(
      new InMemorySceneRepository(),
      new InMemoryDiagramRepository(),
      new InMemoryShareRepository(),
    );

    await assert.rejects(
      () => saveScene.execute("diagram-1", "missing-scene", [], {}),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("refuses a save computed before a replace and hands back the current scene", async () => {
    const scenes = new InMemorySceneRepository();
    const saveScene = new SaveSceneUseCase(
      scenes,
      new InMemoryDiagramRepository(),
      new InMemoryShareRepository(),
    );
    const scene = await scenes.create({
      diagramId: "diagram-1",
      name: "Scene 1",
      sortOrder: 0,
      elements: [{ id: "kept", version: 1 }],
    });
    const seen = scene.revision;
    await scenes.updateScene(scene.id, [{ id: "restored", version: 1 }], {});

    const result = await saveScene.execute(
      "diagram-1",
      scene.id,
      [
        { id: "kept", version: 1 },
        { id: "edited-before-restore", version: 1 },
      ],
      {},
      seen,
    );

    assert.equal(result.status, "stale");
    assert.deepEqual(result.status === "stale" && result.scene.revision, seen + 1);
    assert.deepEqual((await scenes.findById(scene.id))!.elements, [{ id: "restored", version: 1 }]);
  });

  it("merges a save that carries the current revision, and one from an older client carrying none", async () => {
    const scenes = new InMemorySceneRepository();
    const saveScene = new SaveSceneUseCase(
      scenes,
      new InMemoryDiagramRepository(),
      new InMemoryShareRepository(),
    );
    const scene = await scenes.create({ diagramId: "diagram-1", name: "Scene 1", sortOrder: 0 });
    await scenes.updateScene(scene.id, [{ id: "restored", version: 1 }], {});

    const current = await saveScene.execute(
      "diagram-1",
      scene.id,
      [{ id: "new", version: 1 }],
      {},
      scene.revision,
    );
    const unversioned = await saveScene.execute(
      "diagram-1",
      scene.id,
      [{ id: "old", version: 1 }],
      {},
    );

    assert.deepEqual([current.status, unversioned.status], ["saved", "saved"]);
    const ids = ((await scenes.findById(scene.id))!.elements as { id: string }[]).map((e) => e.id);
    // The merge walks the incoming elements first, then appends what only the stored scene had.
    assert.deepEqual(ids, ["old", "new", "restored"]);
  });
});

describe("SaveSceneUseCase.assertCanEdit", () => {
  function setup() {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const saveScene = new SaveSceneUseCase(new InMemorySceneRepository(), diagrams, shares);
    return { diagrams, shares, saveScene };
  }

  it("allows the owner and refuses a user with no access to the diagram", async () => {
    const { diagrams, saveScene } = setup();
    const diagram = await diagrams.create({ title: "D", ownerId: "owner-1" });

    await saveScene.assertCanEdit(diagram.id, { kind: "user", userId: "owner-1" });
    await assert.rejects(
      () => saveScene.assertCanEdit(diagram.id, { kind: "user", userId: "stranger" }),
      ForbiddenError,
    );
  });

  it("refuses a guest whose link is gone, expired, read-only or for another diagram", async () => {
    const { shares, saveScene } = setup();
    const make = (role: "editor" | "viewer", expiresAt: Date | null, diagramId = "d1") =>
      shares.create({ diagramId, createdBy: "u", role, expiresAt });
    const ok = await make("editor", null);
    const expired = await make("editor", new Date(Date.now() - 1000));
    const viewer = await make("viewer", null);
    const other = await make("editor", null, "d2");

    await saveScene.assertCanEdit("d1", { kind: "guest", shareToken: ok.token });
    for (const token of [expired.token, viewer.token, other.token, "missing"]) {
      await assert.rejects(
        () => saveScene.assertCanEdit("d1", { kind: "guest", shareToken: token }),
        ForbiddenError,
      );
    }
  });
});

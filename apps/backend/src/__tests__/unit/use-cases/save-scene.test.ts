import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { NotFoundError } from "../../../domain/errors";

describe("SaveSceneUseCase", () => {
  it("persists elements and appState into a scene of the diagram", async () => {
    const scenes = new InMemorySceneRepository();
    const saveScene = new SaveSceneUseCase(scenes);

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
    const saveScene = new SaveSceneUseCase(scenes);

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
    const saveScene = new SaveSceneUseCase(new InMemorySceneRepository());

    await assert.rejects(
      () => saveScene.execute("diagram-1", "missing-scene", [], {}),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});

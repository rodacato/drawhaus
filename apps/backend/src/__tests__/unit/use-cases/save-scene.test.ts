import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";

describe("SaveSceneUseCase", () => {
  it("persists elements and appState", async () => {
    const scenes = new InMemorySceneRepository();
    const saveScene = new SaveSceneUseCase(scenes);

    const scene = await scenes.create({
      diagramId: "diagram-1",
      name: "Scene 1",
      sortOrder: 0,
    });

    const elements = [{ id: "el1", type: "rectangle" }];
    const appState = { zoom: 1.5 };

    await saveScene.execute(scene.id, elements, appState);

    const updated = scenes.store[0];
    assert.deepEqual(updated.elements, elements);
    assert.deepEqual(updated.appState, appState);
  });
});

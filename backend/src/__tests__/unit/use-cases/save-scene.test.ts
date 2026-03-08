import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";

describe("SaveSceneUseCase", () => {
  it("persists elements and appState", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const saveScene = new SaveSceneUseCase(diagrams);

    const diagram = await createDiagram.execute({ ownerId: "user-1" });
    const elements = [{ id: "el1", type: "rectangle" }];
    const appState = { zoom: 1.5 };

    await saveScene.execute(diagram.id, elements, appState);

    const updated = diagrams.store[0];
    assert.deepEqual(updated.elements, elements);
    assert.deepEqual(updated.appState, appState);
  });
});

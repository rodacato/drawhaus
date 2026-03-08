import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";

describe("CreateDiagramUseCase", () => {
  it("creates diagram with given title", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const useCase = new CreateDiagramUseCase(diagrams);

    const result = await useCase.execute({ ownerId: "user-1", title: "My Board" });

    assert.equal(result.title, "My Board");
    assert.equal(result.ownerId, "user-1");
    assert.deepEqual(result.elements, []);
    assert.equal(diagrams.store.length, 1);
  });

  it("defaults title to Untitled", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const useCase = new CreateDiagramUseCase(diagrams);

    const result = await useCase.execute({ ownerId: "user-1" });
    assert.equal(result.title, "Untitled");
  });
});

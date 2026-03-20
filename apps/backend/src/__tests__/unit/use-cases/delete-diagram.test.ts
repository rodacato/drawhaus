import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { DeleteDiagramUseCase } from "../../../application/use-cases/diagrams/delete-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { ForbiddenError } from "../../../domain/errors";

describe("DeleteDiagramUseCase", () => {
  it("owner can delete", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const create = new CreateDiagramUseCase(diagrams);
    const del = new DeleteDiagramUseCase(diagrams);

    const diagram = await create.execute({ ownerId: "user-1" });
    await del.execute(diagram.id, "user-1");

    assert.equal(diagrams.store.length, 0);
  });

  it("non-owner cannot delete", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const create = new CreateDiagramUseCase(diagrams);
    const del = new DeleteDiagramUseCase(diagrams);

    const diagram = await create.execute({ ownerId: "user-1" });

    await assert.rejects(
      () => del.execute(diagram.id, "user-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });
});

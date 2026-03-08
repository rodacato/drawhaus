import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { UpdateDiagramUseCase } from "../../../application/use-cases/diagrams/update-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

describe("UpdateDiagramUseCase", () => {
  it("owner can update title", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const create = new CreateDiagramUseCase(diagrams);
    const update = new UpdateDiagramUseCase(diagrams);

    const diagram = await create.execute({ ownerId: "user-1", title: "Old" });
    const updated = await update.execute(diagram.id, "user-1", { title: "New" });

    assert.equal(updated.title, "New");
  });

  it("editor can update", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const create = new CreateDiagramUseCase(diagrams);
    const update = new UpdateDiagramUseCase(diagrams);

    const diagram = await create.execute({ ownerId: "user-1" });
    diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "editor" });

    const updated = await update.execute(diagram.id, "user-2", { title: "Edited" });
    assert.equal(updated.title, "Edited");
  });

  it("viewer cannot update", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const create = new CreateDiagramUseCase(diagrams);
    const update = new UpdateDiagramUseCase(diagrams);

    const diagram = await create.execute({ ownerId: "user-1" });
    diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "viewer" });

    await assert.rejects(
      () => update.execute(diagram.id, "user-2", { title: "Nope" }),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("stranger gets not found", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const create = new CreateDiagramUseCase(diagrams);
    const update = new UpdateDiagramUseCase(diagrams);

    const diagram = await create.execute({ ownerId: "user-1" });

    await assert.rejects(
      () => update.execute(diagram.id, "user-3", { title: "Nope" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});

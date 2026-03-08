import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { CreateShareLinkUseCase } from "../../../application/use-cases/share/create-link";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

describe("CreateShareLinkUseCase", () => {
  it("owner can create share link", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const createLink = new CreateShareLinkUseCase(shares, diagrams);

    const diagram = await createDiagram.execute({ ownerId: "user-1" });
    const link = await createLink.execute({
      diagramId: diagram.id,
      userId: "user-1",
      role: "editor",
    });

    assert.equal(link.role, "editor");
    assert.equal(link.diagramId, diagram.id);
    assert.ok(link.token);
  });

  it("viewer cannot create share link", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const createLink = new CreateShareLinkUseCase(shares, diagrams);

    const diagram = await createDiagram.execute({ ownerId: "user-1" });
    diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "viewer" });

    await assert.rejects(
      () => createLink.execute({ diagramId: diagram.id, userId: "user-2" }),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("stranger gets not found", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createLink = new CreateShareLinkUseCase(shares, diagrams);

    await assert.rejects(
      () => createLink.execute({ diagramId: "non-existent", userId: "user-1" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("sets expiration when expiresInHours provided", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const createLink = new CreateShareLinkUseCase(shares, diagrams);

    const diagram = await createDiagram.execute({ ownerId: "user-1" });
    const before = Date.now();
    const link = await createLink.execute({
      diagramId: diagram.id,
      userId: "user-1",
      expiresInHours: 24,
    });

    assert.ok(link.expiresAt);
    const diff = link.expiresAt.getTime() - before;
    assert.ok(diff >= 23 * 3600_000 && diff <= 25 * 3600_000);
  });
});

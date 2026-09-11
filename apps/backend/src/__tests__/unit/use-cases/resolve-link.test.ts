import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { CreateShareLinkUseCase } from "../../../application/use-cases/share/create-link";
import { ResolveLinkUseCase } from "../../../application/use-cases/share/resolve-link";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { NotFoundError, ExpiredError } from "../../../domain/errors";

describe("ResolveLinkUseCase", () => {
  it("resolves valid link with diagram", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(
      diagrams,
      new InMemoryWorkspaceRepository(),
      new InMemoryFolderRepository(),
    );
    const createLink = new CreateShareLinkUseCase(shares, diagrams);
    const resolve = new ResolveLinkUseCase(shares, diagrams, diagrams.scenes);

    const diagram = await createDiagram.execute({ ownerId: "user-1", title: "Test" });
    const link = await createLink.execute({ diagramId: diagram.id, userId: "user-1" });

    const result = await resolve.execute(link.token);
    assert.equal(result.diagram.title, "Test");
    assert.equal(result.link.role, "viewer");
  });

  it("rejects unknown token", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const resolve = new ResolveLinkUseCase(shares, diagrams, diagrams.scenes);

    await assert.rejects(
      () => resolve.execute("nonexistent"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("rejects expired link", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(
      diagrams,
      new InMemoryWorkspaceRepository(),
      new InMemoryFolderRepository(),
    );
    const resolve = new ResolveLinkUseCase(shares, diagrams, diagrams.scenes);

    const diagram = await createDiagram.execute({ ownerId: "user-1" });
    // Manually insert an expired link
    shares.store.push({
      token: "expired-token",
      diagramId: diagram.id,
      createdBy: "user-1",
      role: "viewer",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });

    await assert.rejects(
      () => resolve.execute("expired-token"),
      (err: unknown) => err instanceof ExpiredError,
    );
  });

  it("serves the board's content, not the diagram row's stale copy", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const resolve = new ResolveLinkUseCase(shares, diagrams, diagrams.scenes);
    const stale = [{ id: "row-1", type: "rectangle" }];
    const board = [{ id: "board-1", type: "ellipse" }];
    const diagram = await diagrams.create({ ownerId: "user-1", title: "T", elements: stale });
    await diagrams.scenes.create({
      diagramId: diagram.id,
      name: "Scene 1",
      sortOrder: 0,
      elements: board,
    });
    const link = await new CreateShareLinkUseCase(shares, diagrams).execute({
      diagramId: diagram.id,
      userId: "user-1",
    });

    const result = await resolve.execute(link.token);

    assert.deepEqual(result.diagram.elements, board);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { CreateShareLinkUseCase } from "../../../application/use-cases/share/create-link";
import { ResolveLinkUseCase } from "../../../application/use-cases/share/resolve-link";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { NotFoundError, ExpiredError } from "../../../domain/errors";

describe("ResolveLinkUseCase", () => {
  it("resolves valid link with diagram", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const createLink = new CreateShareLinkUseCase(shares, diagrams);
    const resolve = new ResolveLinkUseCase(shares, diagrams);

    const diagram = await createDiagram.execute({ ownerId: "user-1", title: "Test" });
    const link = await createLink.execute({ diagramId: diagram.id, userId: "user-1" });

    const result = await resolve.execute(link.token);
    assert.equal(result.diagram.title, "Test");
    assert.equal(result.link.role, "viewer");
  });

  it("rejects unknown token", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const resolve = new ResolveLinkUseCase(shares, diagrams);

    await assert.rejects(
      () => resolve.execute("nonexistent"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("rejects expired link", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const resolve = new ResolveLinkUseCase(shares, diagrams);

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
});

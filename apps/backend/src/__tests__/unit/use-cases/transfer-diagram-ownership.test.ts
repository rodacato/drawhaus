import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TransferDiagramOwnershipUseCase } from "../../../application/use-cases/diagrams/transfer-ownership";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";

describe("TransferDiagramOwnershipUseCase", () => {
  function setup() {
    const diagrams = new InMemoryDiagramRepository();
    const workspaces = new InMemoryWorkspaceRepository();
    const audit = new NoopAuditLogger();
    const useCase = new TransferDiagramOwnershipUseCase(diagrams, workspaces, audit);
    return { diagrams, workspaces, useCase };
  }

  it("owner can transfer diagram ownership", async () => {
    const { diagrams, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "member-2", "editor");
    const d = await diagrams.create({ title: "D1", ownerId: "owner-1", workspaceId: ws.id });

    await useCase.execute([d.id], "owner-1", "member-2");

    assert.equal((await diagrams.findById(d.id))!.ownerId, "member-2");
  });

  it("non-owner cannot transfer", async () => {
    const { diagrams, useCase } = setup();
    const d = await diagrams.create({ title: "D1", ownerId: "owner-1" });

    await assert.rejects(
      () => useCase.execute([d.id], "other-user", "someone"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("cannot transfer to self", async () => {
    const { diagrams, useCase } = setup();
    const d = await diagrams.create({ title: "D1", ownerId: "owner-1" });

    await assert.rejects(
      () => useCase.execute([d.id], "owner-1", "owner-1"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("throws not found for missing diagram", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute(["missing-id"], "owner-1", "member-2"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("new owner must be workspace member if diagram has workspace", async () => {
    const { diagrams, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    const d = await diagrams.create({ title: "D1", ownerId: "owner-1", workspaceId: ws.id });

    await assert.rejects(
      () => useCase.execute([d.id], "owner-1", "outsider"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("can transfer diagram without workspace to anyone", async () => {
    const { diagrams, useCase } = setup();
    const d = await diagrams.create({ title: "D1", ownerId: "owner-1" });

    await useCase.execute([d.id], "owner-1", "anyone");

    assert.equal((await diagrams.findById(d.id))!.ownerId, "anyone");
  });

  it("bulk transfer works for multiple diagrams", async () => {
    const { diagrams, useCase } = setup();
    const d1 = await diagrams.create({ title: "D1", ownerId: "owner-1" });
    const d2 = await diagrams.create({ title: "D2", ownerId: "owner-1" });

    await useCase.execute([d1.id, d2.id], "owner-1", "new-owner");

    assert.equal((await diagrams.findById(d1.id))!.ownerId, "new-owner");
    assert.equal((await diagrams.findById(d2.id))!.ownerId, "new-owner");
  });
});

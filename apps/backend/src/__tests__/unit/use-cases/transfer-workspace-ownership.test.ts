import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TransferWorkspaceOwnershipUseCase } from "../../../application/use-cases/workspaces/transfer-ownership";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";

describe("TransferWorkspaceOwnershipUseCase", () => {
  function setup() {
    const workspaces = new InMemoryWorkspaceRepository();
    const diagrams = new InMemoryDiagramRepository();
    const templates = new InMemoryTemplateRepository();
    const audit = new NoopAuditLogger();
    const useCase = new TransferWorkspaceOwnershipUseCase(workspaces, diagrams, templates, audit);
    return { workspaces, diagrams, templates, useCase };
  }

  it("owner can transfer ownership to an admin member", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "admin-2", "admin");

    await useCase.execute(ws.id, "owner-1", "admin-2");

    const updated = await workspaces.findById(ws.id);
    assert.equal(updated!.ownerId, "admin-2");
    // Old owner should still be a member (as admin)
    const oldRole = await workspaces.findMemberRole(ws.id, "owner-1");
    assert.equal(oldRole, "admin");
  });

  it("non-owner cannot transfer ownership", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "admin-2", "admin");

    await assert.rejects(
      () => useCase.execute(ws.id, "admin-2", "admin-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("cannot transfer to a non-admin member", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "editor-2", "editor");

    await assert.rejects(
      () => useCase.execute(ws.id, "owner-1", "editor-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("cannot transfer personal workspace", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Personal", ownerId: "owner-1", isPersonal: true });
    await workspaces.addMember(ws.id, "admin-2", "admin");

    await assert.rejects(
      () => useCase.execute(ws.id, "owner-1", "admin-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("cannot transfer to self", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });

    await assert.rejects(
      () => useCase.execute(ws.id, "owner-1", "owner-1"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("throws not found for missing workspace", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("missing-id", "owner-1", "admin-2"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("transfers resources when transferResources is true", async () => {
    const { workspaces, diagrams, templates, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "admin-2", "admin");

    // Create diagrams and templates owned by owner-1 in this workspace
    const d1 = await diagrams.create({ title: "D1", ownerId: "owner-1", workspaceId: ws.id });
    const d2 = await diagrams.create({ title: "D2", ownerId: "owner-1", workspaceId: ws.id });
    const d3 = await diagrams.create({ title: "D3", ownerId: "other-user", workspaceId: ws.id }); // not owned
    const t1 = await templates.create({ creatorId: "owner-1", workspaceId: ws.id, title: "T1", description: "", category: "general", elements: [], appState: {} });

    const result = await useCase.execute(ws.id, "owner-1", "admin-2", true);

    assert.equal(result.diagramCount, 2);
    assert.equal(result.templateCount, 1);

    // Verify diagrams transferred
    assert.equal((await diagrams.findById(d1.id))!.ownerId, "admin-2");
    assert.equal((await diagrams.findById(d2.id))!.ownerId, "admin-2");
    assert.equal((await diagrams.findById(d3.id))!.ownerId, "other-user"); // unchanged
    assert.equal((await templates.findById(t1.id))!.creatorId, "admin-2");
  });

  it("does not transfer resources when transferResources is false", async () => {
    const { workspaces, diagrams, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "admin-2", "admin");

    const d1 = await diagrams.create({ title: "D1", ownerId: "owner-1", workspaceId: ws.id });

    const result = await useCase.execute(ws.id, "owner-1", "admin-2", false);

    assert.equal(result.diagramCount, 0);
    assert.equal(result.templateCount, 0);
    assert.equal((await diagrams.findById(d1.id))!.ownerId, "owner-1"); // unchanged
  });
});

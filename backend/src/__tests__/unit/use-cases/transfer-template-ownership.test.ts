import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TransferTemplateOwnershipUseCase } from "../../../application/use-cases/templates/transfer-ownership";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";

describe("TransferTemplateOwnershipUseCase", () => {
  function setup() {
    const templates = new InMemoryTemplateRepository();
    const workspaces = new InMemoryWorkspaceRepository();
    const audit = new NoopAuditLogger();
    const useCase = new TransferTemplateOwnershipUseCase(templates, workspaces, audit);
    return { templates, workspaces, useCase };
  }

  it("creator can transfer template ownership", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "member-2", "editor");
    const t = await templates.create({ creatorId: "owner-1", workspaceId: ws.id, title: "T1", description: "", category: "general", elements: [], appState: {} });

    await useCase.execute([t.id], "owner-1", "member-2");

    assert.equal((await templates.findById(t.id))!.creatorId, "member-2");
  });

  it("non-creator cannot transfer", async () => {
    const { templates, useCase } = setup();
    const t = await templates.create({ creatorId: "owner-1", title: "T1", description: "", category: "general", elements: [], appState: {} });

    await assert.rejects(
      () => useCase.execute([t.id], "other-user", "someone"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("cannot transfer built-in template", async () => {
    const { templates, useCase } = setup();
    const t = await templates.create({ creatorId: "owner-1", title: "Built-in", description: "", category: "general", elements: [], appState: {} });
    // Manually set isBuiltIn
    t.isBuiltIn = true;

    await assert.rejects(
      () => useCase.execute([t.id], "owner-1", "member-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("cannot transfer to self", async () => {
    const { templates, useCase } = setup();
    const t = await templates.create({ creatorId: "owner-1", title: "T1", description: "", category: "general", elements: [], appState: {} });

    await assert.rejects(
      () => useCase.execute([t.id], "owner-1", "owner-1"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("throws not found for missing template", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute(["missing-id"], "owner-1", "member-2"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("new creator must be workspace member if template has workspace", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    const t = await templates.create({ creatorId: "owner-1", workspaceId: ws.id, title: "T1", description: "", category: "general", elements: [], appState: {} });

    await assert.rejects(
      () => useCase.execute([t.id], "owner-1", "outsider"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });
});

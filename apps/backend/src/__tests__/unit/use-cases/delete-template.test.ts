import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DeleteTemplateUseCase } from "../../../application/use-cases/templates/delete-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

function setup() {
  const templates = new InMemoryTemplateRepository();
  const workspaces = new InMemoryWorkspaceRepository();
  return { templates, workspaces, useCase: new DeleteTemplateUseCase(templates, workspaces) };
}

describe("DeleteTemplateUseCase", () => {
  it("deletes template owned by user", async () => {
    const { templates, useCase } = setup();

    const created = await templates.create({
      creatorId: "user-1",
      title: "To Delete",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await useCase.execute(created.id, "user-1");
    assert.equal(templates.store.length, 0);
  });

  it("throws NotFoundError for non-existent template", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("nonexistent", "user-1"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws NotFoundError for a template the user cannot read", async () => {
    const { templates, useCase } = setup();

    const created = await templates.create({
      creatorId: "user-1",
      title: "Not yours",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await assert.rejects(
      () => useCase.execute(created.id, "user-2"),
      (err: unknown) => err instanceof NotFoundError,
    );
    assert.equal(templates.store.length, 1);
  });

  it("throws ForbiddenError for a workspace member who is not the creator", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "user-1" });
    await workspaces.addMember(ws.id, "user-2", "admin");

    const created = await templates.create({
      creatorId: "user-1",
      workspaceId: ws.id,
      title: "Shared",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await assert.rejects(
      () => useCase.execute(created.id, "user-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
    assert.equal(templates.store.length, 1);
  });

  it("throws ForbiddenError for built-in templates", async () => {
    const { templates, useCase } = setup();

    const created = await templates.create({
      creatorId: "user-1",
      title: "Built-in",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });
    // Manually mark as built-in
    created.isBuiltIn = true;

    await assert.rejects(
      () => useCase.execute(created.id, "user-1"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });
});

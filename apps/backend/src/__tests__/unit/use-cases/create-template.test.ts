import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateTemplateUseCase } from "../../../application/use-cases/templates/create-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { ForbiddenError } from "../../../domain/errors";

function setup() {
  const templates = new InMemoryTemplateRepository();
  const workspaces = new InMemoryWorkspaceRepository();
  return { templates, workspaces, useCase: new CreateTemplateUseCase(templates, workspaces) };
}

describe("CreateTemplateUseCase", () => {
  it("creates template with given data", async () => {
    const { templates, useCase } = setup();

    const result = await useCase.execute({
      creatorId: "user-1",
      title: "My Template",
      elements: [{ type: "rectangle" }],
      appState: { zoom: 1 },
      category: "architecture",
      description: "A test template",
    });

    assert.equal(result.title, "My Template");
    assert.equal(result.creatorId, "user-1");
    assert.equal(result.category, "architecture");
    assert.equal(result.description, "A test template");
    assert.deepEqual(result.elements, [{ type: "rectangle" }]);
    assert.equal(templates.store.length, 1);
  });

  it("defaults category to general and description to empty", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      creatorId: "user-1",
      title: "Minimal",
      elements: [],
      appState: {},
    });

    assert.equal(result.category, "general");
    assert.equal(result.description, "");
  });

  it("stores workspaceId of a workspace the creator belongs to", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "user-1" });

    const result = await useCase.execute({
      creatorId: "user-1",
      workspaceId: ws.id,
      title: "Workspace Template",
      elements: [],
      appState: {},
    });

    assert.equal(result.workspaceId, ws.id);
  });

  it("rejects a workspace the creator is not a member of and stores nothing", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });

    await assert.rejects(
      () =>
        useCase.execute({
          creatorId: "intruder",
          workspaceId: ws.id,
          title: "Planted",
          elements: [],
          appState: {},
        }),
      (err: unknown) => err instanceof ForbiddenError,
    );
    assert.equal(templates.store.length, 0);
  });
});

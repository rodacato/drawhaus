import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UseTemplateUseCase } from "../../../application/use-cases/templates/use-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";

function setup() {
  const templates = new InMemoryTemplateRepository();
  const diagrams = new InMemoryDiagramRepository();
  const workspaces = new InMemoryWorkspaceRepository();
  const folders = new InMemoryFolderRepository();
  return {
    templates,
    diagrams,
    workspaces,
    folders,
    useCase: new UseTemplateUseCase(templates, diagrams, workspaces, folders),
  };
}

function createTemplate(
  templates: InMemoryTemplateRepository,
  { title = "Architecture", creatorId = "user-1", workspaceId = null as string | null } = {},
) {
  return templates.create({
    creatorId,
    workspaceId,
    title,
    description: "",
    category: "general",
    elements: [{ type: "rectangle", id: "r1" }],
    appState: { zoom: 1.5 },
  });
}

describe("UseTemplateUseCase", () => {
  it("creates a diagram from a template", async () => {
    const { templates, diagrams, useCase } = setup();
    const template = await createTemplate(templates);

    const diagram = await useCase.execute({
      templateId: template.id,
      userId: "user-1",
    });

    assert.equal(diagram.ownerId, "user-1");
    assert.equal(diagram.title, "Architecture");
    assert.deepEqual(diagram.elements, [{ type: "rectangle", id: "r1" }]);
    assert.equal(diagrams.store.length, 1);
  });

  it("uses custom title when provided", async () => {
    const { templates, useCase } = setup();
    const template = await createTemplate(templates, { title: "Default Name" });

    const diagram = await useCase.execute({
      templateId: template.id,
      userId: "user-1",
      title: "My Custom Board",
    });

    assert.equal(diagram.title, "My Custom Board");
  });

  it("throws NotFoundError for non-existent template", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute({ templateId: "nonexistent", userId: "user-1" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("copies a teammate's template shared in a workspace the user belongs to", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "author" });
    await workspaces.addMember(ws.id, "user-1", "viewer");
    const template = await createTemplate(templates, { creatorId: "author", workspaceId: ws.id });

    const diagram = await useCase.execute({ templateId: template.id, userId: "user-1" });

    assert.deepEqual(diagram.elements, template.elements);
  });

  it("hides a template the user cannot read and copies nothing", async () => {
    const { templates, diagrams, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "author" });
    const personal = await createTemplate(templates, { creatorId: "author" });
    const shared = await createTemplate(templates, { creatorId: "author", workspaceId: ws.id });

    for (const template of [personal, shared]) {
      await assert.rejects(
        () => useCase.execute({ templateId: template.id, userId: "stranger" }),
        (err: unknown) => err instanceof NotFoundError,
      );
    }
    assert.equal(diagrams.store.length, 0);
  });

  it("increments usage count after creating diagram", async () => {
    const { templates, useCase } = setup();
    const template = await createTemplate(templates, { title: "Popular" });

    await useCase.execute({ templateId: template.id, userId: "user-1" });
    // Wait a tick for the fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 10));

    const updated = await templates.findById(template.id);
    assert.equal(updated!.usageCount, 1);
  });

  it("creates into a workspace the user is a member of", async () => {
    const { templates, workspaces, useCase } = setup();
    const template = await createTemplate(templates);
    const ws = await workspaces.create({ name: "Team", ownerId: "user-1" });

    const diagram = await useCase.execute({
      templateId: template.id,
      userId: "user-1",
      workspaceId: ws.id,
    });

    assert.equal(diagram.workspaceId, ws.id);
  });

  it("rejects a workspace the user is not a member of and creates nothing", async () => {
    const { templates, diagrams, workspaces, useCase } = setup();
    const template = await createTemplate(templates, { creatorId: "intruder" });
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });

    await assert.rejects(
      () => useCase.execute({ templateId: template.id, userId: "intruder", workspaceId: ws.id }),
      (err: unknown) => err instanceof ForbiddenError,
    );
    assert.equal(diagrams.store.length, 0);
  });

  it("rejects a folder of another workspace", async () => {
    const { templates, workspaces, folders, useCase } = setup();
    const template = await createTemplate(templates);
    const target = await workspaces.create({ name: "A", ownerId: "user-1" });
    const folder = await folders.create({ ownerId: "user-1", workspaceId: "ws-other", name: "X" });

    await assert.rejects(
      () =>
        useCase.execute({
          templateId: template.id,
          userId: "user-1",
          workspaceId: target.id,
          folderId: folder.id,
        }),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ListTemplatesUseCase } from "../../../application/use-cases/templates/list-templates";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { ForbiddenError } from "../../../domain/errors";

function setup() {
  const templates = new InMemoryTemplateRepository();
  const workspaces = new InMemoryWorkspaceRepository();
  return { templates, workspaces, useCase: new ListTemplatesUseCase(templates, workspaces) };
}

function createTemplate(
  templates: InMemoryTemplateRepository,
  data: { creatorId: string; title: string; workspaceId?: string },
) {
  return templates.create({
    ...data,
    description: "",
    category: "general",
    elements: [],
    appState: {},
  });
}

describe("ListTemplatesUseCase", () => {
  it("executeMine returns all templates by a user regardless of workspace", async () => {
    const { templates, useCase } = setup();
    await createTemplate(templates, { creatorId: "user-1", title: "Personal Template" });
    await createTemplate(templates, {
      creatorId: "user-1",
      workspaceId: "ws-1",
      title: "Workspace Template",
    });
    await createTemplate(templates, { creatorId: "user-2", title: "Other User Template" });

    const mine = await useCase.executeMine("user-1");
    assert.equal(mine.length, 2);
    assert.ok(mine.some((t) => t.title === "Personal Template"));
    assert.ok(mine.some((t) => t.title === "Workspace Template"));
  });

  it("executeByWorkspace returns only workspace templates to a member", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "user-1" });
    await createTemplate(templates, { creatorId: "user-1", workspaceId: ws.id, title: "WS" });
    await createTemplate(templates, { creatorId: "user-1", title: "Personal" });

    const listed = await useCase.executeByWorkspace(ws.id, "user-1");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].title, "WS");
  });

  it("executeByWorkspace rejects a user who is not a member", async () => {
    const { templates, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await createTemplate(templates, { creatorId: "owner-1", workspaceId: ws.id, title: "Secret" });

    await assert.rejects(
      () => useCase.executeByWorkspace(ws.id, "intruder"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("executeAll returns everything", async () => {
    const { templates, useCase } = setup();
    await createTemplate(templates, { creatorId: "user-1", title: "A" });
    await createTemplate(templates, { creatorId: "user-2", workspaceId: "ws-1", title: "B" });

    const all = await useCase.executeAll();
    assert.equal(all.length, 2);
  });
});

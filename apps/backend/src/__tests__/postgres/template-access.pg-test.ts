import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GetTemplateUseCase } from "../../application/use-cases/templates/get-template";
import { UseTemplateUseCase } from "../../application/use-cases/templates/use-template";
import { NotFoundError } from "../../domain/errors";
import { PgDiagramRepository } from "../../infrastructure/persistence/pg-diagram-repository";
import { PgFolderRepository } from "../../infrastructure/persistence/pg-folder-repository";
import { PgTemplateRepository } from "../../infrastructure/persistence/pg-template-repository";
import { PgWorkspaceRepository } from "../../infrastructure/persistence/pg-workspace-repository";
import { addWorkspaceMember, countRows, createUser, createWorkspace } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const templates = new PgTemplateRepository();
const workspaces = new PgWorkspaceRepository();
const getTemplate = new GetTemplateUseCase(templates, workspaces);
const useTemplate = new UseTemplateUseCase(
  templates,
  new PgDiagramRepository(),
  workspaces,
  new PgFolderRepository(),
);

const isNotFound = (err: unknown) => err instanceof NotFoundError;

async function workspaceTemplate() {
  const creator = await createUser("Creator");
  const member = await createUser("Member");
  const stranger = await createUser("Stranger");
  const workspaceId = await createWorkspace(creator);
  await addWorkspaceMember(workspaceId, member, "viewer");
  const template = await templates.create({
    creatorId: creator,
    workspaceId,
    title: "Shared",
    description: "",
    category: "general",
    elements: [{ id: "e1" }],
    appState: {},
  });
  return { creator, member, stranger, workspaceId, template };
}

describe("template read access", () => {
  it("shows a workspace template to a member and hides it from a stranger", async () => {
    const { member, stranger, template } = await workspaceTemplate();

    assert.equal((await getTemplate.execute(template.id, member)).id, template.id);
    await assert.rejects(getTemplate.execute(template.id, stranger), isNotFound);
  });

  it("creates no diagram and counts no use when a stranger uses the template", async () => {
    const { stranger, template } = await workspaceTemplate();

    await assert.rejects(
      useTemplate.execute({ templateId: template.id, userId: stranger }),
      isNotFound,
    );
    assert.equal(await countRows("diagrams"), 0);
    assert.equal((await templates.findById(template.id))?.usageCount, 0);
  });

  it("leaves the template to its creator alone once its workspace is deleted", async () => {
    const { creator, member, workspaceId, template } = await workspaceTemplate();

    await workspaces.delete(workspaceId);

    assert.equal((await getTemplate.execute(template.id, creator)).workspaceId, null);
    await assert.rejects(getTemplate.execute(template.id, member), isNotFound);
  });
});

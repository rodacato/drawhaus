import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { UpdateDiagramUseCase } from "../../../application/use-cases/diagrams/update-diagram";
import { DeleteDiagramUseCase } from "../../../application/use-cases/diagrams/delete-diagram";
import { CreateShareLinkUseCase } from "../../../application/use-cases/share/create-link";
import { CreateTemplateUseCase } from "../../../application/use-cases/templates/create-template";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { FakeWebhookDispatcher } from "../../fakes/fake-webhook-dispatcher";

function setup() {
  const diagrams = new InMemoryDiagramRepository();
  const workspaces = new InMemoryWorkspaceRepository();
  const folders = new InMemoryFolderRepository();
  const shares = new InMemoryShareRepository();
  const templates = new InMemoryTemplateRepository();
  const webhooks = new FakeWebhookDispatcher();
  return {
    diagrams,
    workspaces,
    folders,
    shares,
    templates,
    webhooks,
    create: new CreateDiagramUseCase(diagrams, workspaces, folders, webhooks),
    update: new UpdateDiagramUseCase(diagrams, diagrams.scenes, undefined, webhooks),
    remove: new DeleteDiagramUseCase(diagrams, workspaces, webhooks),
    share: new CreateShareLinkUseCase(shares, diagrams, webhooks),
    createTemplate: new CreateTemplateUseCase(templates, workspaces, webhooks),
  };
}

describe("webhook emission — diagram lifecycle", () => {
  it("emits diagram.created with the diagram's metadata and no scene content", async () => {
    const { create, webhooks } = setup();

    const diagram = await create.execute({ ownerId: "user-1", title: "Board", elements: [{}] });

    assert.deepEqual(webhooks.events(), ["diagram.created"]);
    const emission = webhooks.emissions[0];
    assert.equal(emission.actorId, "user-1");
    assert.equal(emission.data.id, diagram.id);
    assert.equal(emission.data.title, "Board");
    assert.equal(emission.data.elements, undefined);
  });

  it("emits nothing when creation is refused", async () => {
    const { create, workspaces, webhooks } = setup();
    const workspace = await workspaces.create({ name: "Other", ownerId: "user-2" });

    await assert.rejects(() => create.execute({ ownerId: "user-1", workspaceId: workspace.id }));

    assert.deepEqual(webhooks.events(), []);
  });

  it("emits diagram.updated for a content write", async () => {
    const { diagrams, update, webhooks } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Board" });

    await update.execute(diagram.id, "user-1", { elements: [{ id: "a" }] });

    assert.deepEqual(webhooks.events(), ["diagram.updated"]);
    assert.equal(webhooks.emissions[0].data.id, diagram.id);
  });

  it("emits diagram.updated for a title-only write", async () => {
    const { diagrams, update, webhooks } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Old" });

    await update.execute(diagram.id, "user-1", { title: "New" });

    assert.deepEqual(webhooks.events(), ["diagram.updated"]);
    assert.equal(webhooks.emissions[0].data.title, "New");
  });

  it("emits nothing when an update is refused", async () => {
    const { diagrams, update, webhooks } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Board" });
    diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "viewer" });

    await assert.rejects(() => update.execute(diagram.id, "user-2", { title: "Nope" }));

    assert.deepEqual(webhooks.events(), []);
  });

  it("emits diagram.deleted once the row is gone, for the owner and for a workspace admin", async () => {
    const owned = setup();
    const diagram = await owned.diagrams.create({ ownerId: "user-1", title: "Board" });
    await owned.remove.execute(diagram.id, "user-1");
    assert.deepEqual(owned.webhooks.events(), ["diagram.deleted"]);
    assert.equal(owned.webhooks.emissions[0].data.id, diagram.id);

    const shared = setup();
    const workspace = await shared.workspaces.create({ name: "Team", ownerId: "user-9" });
    await shared.workspaces.addMember(workspace.id, "user-2", "admin");
    const wsDiagram = await shared.diagrams.create({
      ownerId: "user-1",
      title: "Board",
      workspaceId: workspace.id,
    });
    await shared.remove.execute(wsDiagram.id, "user-2");
    assert.deepEqual(shared.webhooks.events(), ["diagram.deleted"]);
    assert.equal(shared.webhooks.emissions[0].actorId, "user-2");
  });

  it("emits nothing when a delete is refused", async () => {
    const { diagrams, remove, webhooks } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Board" });

    await assert.rejects(() => remove.execute(diagram.id, "user-2"));

    assert.deepEqual(webhooks.events(), []);
  });
});

describe("webhook emission — sharing and templates", () => {
  it("emits diagram.shared without the link's token", async () => {
    const { diagrams, share, webhooks } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Board" });

    const link = await share.execute({ diagramId: diagram.id, userId: "user-1", role: "editor" });

    assert.deepEqual(webhooks.events(), ["diagram.shared"]);
    const emission = webhooks.emissions[0];
    assert.equal(emission.data.diagramId, diagram.id);
    assert.equal(emission.data.role, "editor");
    assert.ok(link.token);
    assert.equal(
      JSON.stringify(emission.data).includes(link.token),
      false,
      "the share token must never leave the instance in a webhook payload",
    );
  });

  it("emits nothing when share-link creation is refused", async () => {
    const { diagrams, share, webhooks } = setup();
    const diagram = await diagrams.create({ ownerId: "user-1", title: "Board" });
    diagrams.members.push({ diagramId: diagram.id, userId: "user-2", role: "viewer" });

    await assert.rejects(() => share.execute({ diagramId: diagram.id, userId: "user-2" }));

    assert.deepEqual(webhooks.events(), []);
  });

  it("emits template.created", async () => {
    const { createTemplate, webhooks } = setup();

    const template = await createTemplate.execute({
      creatorId: "user-1",
      title: "Flow",
      elements: [],
      appState: {},
    });

    assert.deepEqual(webhooks.events(), ["template.created"]);
    assert.equal(webhooks.emissions[0].data.id, template.id);
    assert.equal(webhooks.emissions[0].data.title, "Flow");
  });

  it("emits nothing when template creation is refused", async () => {
    const { createTemplate, workspaces, webhooks } = setup();
    const workspace = await workspaces.create({ name: "Other", ownerId: "user-2" });

    await assert.rejects(() =>
      createTemplate.execute({
        creatorId: "user-1",
        workspaceId: workspace.id,
        title: "Flow",
        elements: [],
        appState: {},
      }),
    );

    assert.deepEqual(webhooks.events(), []);
  });
});

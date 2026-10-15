import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DuplicateDiagramUseCase } from "../../../application/use-cases/diagrams/duplicate-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { NotFoundError } from "../../../domain/errors";

function setup() {
  const workspaces = new InMemoryWorkspaceRepository();
  const folders = new InMemoryFolderRepository();
  const diagrams = new InMemoryDiagramRepository(undefined, workspaces);
  return {
    workspaces,
    folders,
    diagrams,
    useCase: new DuplicateDiagramUseCase(diagrams, diagrams.scenes, workspaces, folders),
  };
}

describe("DuplicateDiagramUseCase", () => {
  it("reports a missing diagram as not found", async () => {
    const { useCase } = setup();
    await assert.rejects(() => useCase.execute(randomUUID(), randomUUID()), NotFoundError);
  });

  it("keeps the workspace and folder for a member of that workspace", async () => {
    const { useCase, workspaces, folders, diagrams } = setup();
    const ownerId = randomUUID();
    const ws = await workspaces.create({ name: "W", ownerId });
    const folder = await folders.create({ ownerId, workspaceId: ws.id, name: "F" });
    const original = await diagrams.create({
      ownerId,
      title: "D",
      workspaceId: ws.id,
      folderId: folder.id,
    });

    const copy = await useCase.execute(original.id, ownerId);

    assert.equal(copy.workspaceId, ws.id);
    assert.equal(copy.folderId, folder.id);
  });

  it("places the copy in the personal space when the user is only a direct collaborator", async () => {
    const { useCase, workspaces, folders, diagrams } = setup();
    const ownerId = randomUUID();
    const guestId = randomUUID();
    const ws = await workspaces.create({ name: "W", ownerId });
    const folder = await folders.create({ ownerId, workspaceId: ws.id, name: "F" });
    const original = await diagrams.create({
      ownerId,
      title: "D",
      workspaceId: ws.id,
      folderId: folder.id,
    });
    diagrams.members.push({ diagramId: original.id, userId: guestId, role: "viewer" });

    const copy = await useCase.execute(original.id, guestId);

    assert.equal(copy.ownerId, guestId);
    assert.equal(copy.workspaceId, null);
    assert.equal(copy.folderId, null);
  });

  it("drops a folder the user may not use but keeps the workspace", async () => {
    const { useCase, workspaces, diagrams } = setup();
    const ownerId = randomUUID();
    const ws = await workspaces.create({ name: "W", ownerId });
    const original = await diagrams.create({
      ownerId,
      title: "D",
      workspaceId: ws.id,
      folderId: randomUUID(),
    });

    const copy = await useCase.execute(original.id, ownerId);

    assert.equal(copy.workspaceId, ws.id);
    assert.equal(copy.folderId, null);
  });

  it("still refuses a user with no access to the diagram", async () => {
    const { useCase, diagrams } = setup();
    const original = await diagrams.create({ ownerId: randomUUID(), title: "D" });
    await assert.rejects(() => useCase.execute(original.id, randomUUID()), NotFoundError);
  });
});

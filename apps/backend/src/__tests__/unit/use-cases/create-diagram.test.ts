import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { ForbiddenError } from "../../../domain/errors";

function setup() {
  const diagrams = new InMemoryDiagramRepository();
  const workspaces = new InMemoryWorkspaceRepository();
  const folders = new InMemoryFolderRepository();
  return {
    diagrams,
    workspaces,
    folders,
    useCase: new CreateDiagramUseCase(diagrams, workspaces, folders),
  };
}

const isForbidden = (err: unknown) => err instanceof ForbiddenError;

describe("CreateDiagramUseCase", () => {
  it("creates diagram with given title", async () => {
    const { diagrams, useCase } = setup();

    const result = await useCase.execute({ ownerId: "user-1", title: "My Board" });

    assert.equal(result.title, "My Board");
    assert.equal(result.ownerId, "user-1");
    assert.deepEqual(result.elements, []);
    assert.equal(diagrams.store.length, 1);
  });

  it("defaults title to Untitled", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ ownerId: "user-1" });
    assert.equal(result.title, "Untitled");
  });

  it("creates in a workspace the user is a member of", async () => {
    const { workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });
    await workspaces.addMember(ws.id, "user-1", "viewer");

    const result = await useCase.execute({ ownerId: "user-1", workspaceId: ws.id });

    assert.equal(result.workspaceId, ws.id);
  });

  it("rejects a workspace the user is not a member of and creates nothing", async () => {
    const { diagrams, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "owner-1" });

    await assert.rejects(
      () => useCase.execute({ ownerId: "intruder", workspaceId: ws.id }),
      isForbidden,
    );
    assert.equal(diagrams.store.length, 0);
  });

  it("files into a folder of the target workspace", async () => {
    const { workspaces, folders, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "user-1" });
    const folder = await folders.create({ ownerId: "user-2", workspaceId: ws.id, name: "Docs" });

    const result = await useCase.execute({
      ownerId: "user-1",
      workspaceId: ws.id,
      folderId: folder.id,
    });

    assert.equal(result.folderId, folder.id);
  });

  it("rejects a folder of another workspace, even one the user belongs to", async () => {
    const { diagrams, workspaces, folders, useCase } = setup();
    const target = await workspaces.create({ name: "A", ownerId: "user-1" });
    const other = await workspaces.create({ name: "B", ownerId: "user-1" });
    const folder = await folders.create({ ownerId: "user-1", workspaceId: other.id, name: "B" });

    await assert.rejects(
      () => useCase.execute({ ownerId: "user-1", workspaceId: target.id, folderId: folder.id }),
      isForbidden,
    );
    assert.equal(diagrams.store.length, 0);
  });

  it("rejects someone else's folder for personal content", async () => {
    const { folders, useCase } = setup();
    const folder = await folders.create({ ownerId: "user-2", name: "Theirs" });

    await assert.rejects(
      () => useCase.execute({ ownerId: "user-1", folderId: folder.id }),
      isForbidden,
    );
  });

  it("rejects an unknown folder", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute({ ownerId: "user-1", folderId: "missing-folder" }),
      isForbidden,
    );
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MoveDiagramUseCase } from "../../../application/use-cases/folders/move-diagram";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryFolderRepository } from "../../fakes/in-memory-folder-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { ForbiddenError } from "../../../domain/errors";

describe("MoveDiagramUseCase folder placement", () => {
  function setup() {
    const diagrams = new InMemoryDiagramRepository();
    const folders = new InMemoryFolderRepository();
    const workspaces = new InMemoryWorkspaceRepository();
    return {
      diagrams,
      folders,
      workspaces,
      useCase: new MoveDiagramUseCase(diagrams, folders, workspaces),
    };
  }

  it("moves a workspace diagram into a folder created by another member", async () => {
    const { diagrams, folders, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "u1" });
    await workspaces.addMember(ws.id, "u2", "editor");
    const d = await diagrams.create({ title: "D", ownerId: "u1", workspaceId: ws.id });
    const f = await folders.create({ ownerId: "u2", workspaceId: ws.id, name: "F" });

    await useCase.execute(d.id, "u1", f.id);

    assert.equal((await diagrams.findById(d.id))!.folderId, f.id);
  });

  it("rejects a workspace diagram into the owner's personal folder", async () => {
    const { diagrams, folders, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "Team", ownerId: "u1" });
    const d = await diagrams.create({ title: "D", ownerId: "u1", workspaceId: ws.id });
    const f = await folders.create({ ownerId: "u1", name: "Personal" });

    await assert.rejects(() => useCase.execute(d.id, "u1", f.id), ForbiddenError);
  });

  it("rejects a workspace diagram into another workspace's folder", async () => {
    const { diagrams, folders, workspaces, useCase } = setup();
    const ws = await workspaces.create({ name: "A", ownerId: "u1" });
    const other = await workspaces.create({ name: "B", ownerId: "u1" });
    const d = await diagrams.create({ title: "D", ownerId: "u1", workspaceId: ws.id });
    const f = await folders.create({ ownerId: "u1", workspaceId: other.id, name: "F" });

    await assert.rejects(() => useCase.execute(d.id, "u1", f.id), ForbiddenError);
  });
});

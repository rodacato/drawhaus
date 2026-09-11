import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PgDiagramRepository } from "../../infrastructure/persistence/pg-diagram-repository";
import { PgFolderRepository } from "../../infrastructure/persistence/pg-folder-repository";
import { PgSceneRepository } from "../../infrastructure/persistence/pg-scene-repository";
import { PgSessionRepository } from "../../infrastructure/persistence/pg-session-repository";
import { PgSnapshotRepository } from "../../infrastructure/persistence/pg-snapshot-repository";
import { PgUserRepository } from "../../infrastructure/persistence/pg-user-repository";
import { PgWorkspaceRepository } from "../../infrastructure/persistence/pg-workspace-repository";
import {
  addDiagramMember,
  addWorkspaceMember,
  countRows,
  createUser,
  createWorkspace,
} from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const users = new PgUserRepository();
const workspaces = new PgWorkspaceRepository();
const folders = new PgFolderRepository();
const diagrams = new PgDiagramRepository();
const scenes = new PgSceneRepository();
const sessions = new PgSessionRepository();
const snapshots = new PgSnapshotRepository();

async function workspaceWithMember() {
  const owner = await createUser();
  const member = await createUser();
  const workspaceId = await createWorkspace(owner);
  await addWorkspaceMember(workspaceId, member, "editor");
  return { owner, member, workspaceId };
}

describe("deleting a user", () => {
  it("removes their diagrams, with scenes and snapshots, and their sessions and memberships", async () => {
    const leaving = await createUser();
    const staying = await createUser();
    const theirs = await diagrams.create({ title: "Theirs", ownerId: leaving });
    await scenes.create({ diagramId: theirs.id, name: "Scene 1", sortOrder: 0 });
    await snapshots.create({
      diagramId: theirs.id,
      createdBy: leaving,
      trigger: "manual",
      elements: [],
      appState: {},
    });
    await sessions.create(leaving);
    await addWorkspaceMember(await createWorkspace(staying), leaving, "editor");
    const shared = await diagrams.create({ title: "Shared", ownerId: staying });
    await addDiagramMember(shared.id, leaving, "editor");

    await users.delete(leaving);

    assert.equal(await diagrams.findById(theirs.id), null);
    assert.equal(await countRows("scenes", "diagram_id = $1", [theirs.id]), 0);
    assert.equal(await countRows("diagram_snapshots", "diagram_id = $1", [theirs.id]), 0);
    for (const table of ["sessions", "workspace_members", "diagram_members"]) {
      assert.equal(await countRows(table, "user_id = $1", [leaving]), 0, table);
    }
    assert.equal((await diagrams.findById(shared.id))?.ownerId, staying);
  });

  it("keeps the snapshots they took of someone else's diagram, without an author", async () => {
    const leaving = await createUser();
    const diagram = await diagrams.create({ title: "D", ownerId: await createUser() });
    const snapshot = await snapshots.create({
      diagramId: diagram.id,
      createdBy: leaving,
      trigger: "manual",
      elements: [],
      appState: {},
    });

    await users.delete(leaving);

    const after = await snapshots.findById(snapshot.id);
    assert.equal(after?.createdBy, null);
    assert.equal(after?.createdByName, null);
  });

  it("deletes a workspace they own and moves its members' diagrams out of any workspace", async () => {
    const { owner, member, workspaceId } = await workspaceWithMember();
    const membersDiagram = await diagrams.create({ title: "M", ownerId: member, workspaceId });

    await users.delete(owner);

    assert.equal(await workspaces.findById(workspaceId), null);
    const after = await diagrams.findById(membersDiagram.id);
    assert.equal(after?.ownerId, member);
    assert.equal(after?.workspaceId, null);
  });
});

describe("deleting a workspace", () => {
  it("keeps its diagrams and folders with their owners and folder, outside any workspace", async () => {
    const { owner, member, workspaceId } = await workspaceWithMember();
    const folder = await folders.create({ ownerId: owner, workspaceId, name: "Team" });
    const created = [
      await diagrams.create({ title: "O", ownerId: owner, workspaceId, folderId: folder.id }),
      await diagrams.create({ title: "M", ownerId: member, workspaceId, folderId: folder.id }),
    ];

    await workspaces.delete(workspaceId);

    for (const diagram of created) {
      const after = await diagrams.findById(diagram.id);
      assert.equal(after?.ownerId, diagram.ownerId);
      assert.equal(after?.workspaceId, null);
      assert.equal(after?.folderId, folder.id);
    }
    const folderAfter = await folders.findById(folder.id);
    assert.equal(folderAfter?.ownerId, owner);
    assert.equal(folderAfter?.workspaceId, null);
  });

  it("ends the access that only the workspace granted", async () => {
    const { owner, member, workspaceId } = await workspaceWithMember();
    const ownersDiagram = await diagrams.create({ title: "O", ownerId: owner, workspaceId });
    const membersDiagram = await diagrams.create({ title: "M", ownerId: member, workspaceId });
    assert.equal(await diagrams.findAccessRole(membersDiagram.id, owner), "editor");

    await workspaces.delete(workspaceId);

    assert.equal(await diagrams.findAccessRole(membersDiagram.id, owner), null);
    assert.equal(await diagrams.findAccessRole(ownersDiagram.id, member), null);
    assert.equal(await diagrams.findAccessRole(membersDiagram.id, member), "owner");
    assert.equal(await countRows("workspace_members", "workspace_id = $1", [workspaceId]), 0);
  });
});

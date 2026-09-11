import { describe, it } from "node:test";
import crypto from "node:crypto";
import {
  diagramRepositoryContract,
  type DiagramRepositoryFixture,
} from "../../contracts/diagram-repository-contract";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../../fakes/in-memory-scene-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";

function setup(): DiagramRepositoryFixture {
  const workspaces = new InMemoryWorkspaceRepository();
  const repo = new InMemoryDiagramRepository(new InMemorySceneRepository(), workspaces);
  return {
    repo,
    createUser: async () => crypto.randomUUID(),
    createWorkspace: async (ownerId) => (await workspaces.create({ name: "W", ownerId })).id,
    addWorkspaceMember: (workspaceId, userId, role) =>
      workspaces.addMember(workspaceId, userId, role),
    addDiagramMember: async (diagramId, userId, role) => {
      repo.members.push({ diagramId, userId, role });
    },
  };
}

describe("InMemoryDiagramRepository contract", () => {
  for (const { name, run } of diagramRepositoryContract) {
    it(name, () => run(setup()));
  }
});

import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { DiagramRepository } from "../../domain/ports/diagram-repository";
import type { Diagram } from "../../domain/entities/diagram";
import type { WorkspaceRole } from "../../domain/entities/workspace";

export type DiagramRepositoryFixture = {
  repo: DiagramRepository;
  createUser(): Promise<string>;
  createWorkspace(ownerId: string): Promise<string>;
  addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
  addDiagramMember(diagramId: string, userId: string, role: "editor" | "viewer"): Promise<void>;
};

export type ContractCase = { name: string; run: (f: DiagramRepositoryFixture) => Promise<void> };

function titles(diagrams: Diagram[]): string[] {
  return diagrams.map((d) => d.title).sort((a, b) => a.localeCompare(b));
}

/**
 * A user who reaches diagrams through every path: ownership, a diagram membership,
 * a workspace membership, and both memberships at once.
 */
async function seedVisibility(f: DiagramRepositoryFixture) {
  const user = await f.createUser();
  const other = await f.createUser();
  const workspaceId = await f.createWorkspace(other);
  await f.addWorkspaceMember(workspaceId, user, "viewer");

  await f.repo.create({ title: "Mine roadmap", ownerId: user });
  const shared = await f.repo.create({ title: "Shared ROADMAP", ownerId: other });
  await f.addDiagramMember(shared.id, user, "viewer");
  await f.repo.create({ title: "Team roadmap", ownerId: other, workspaceId });
  const both = await f.repo.create({ title: "Both", ownerId: other, workspaceId });
  await f.addDiagramMember(both.id, user, "editor");
  await f.repo.create({ title: "Private roadmap", ownerId: other });

  return { user, other, workspaceId };
}

/** The same cases run against InMemoryDiagramRepository (npm test) and PgDiagramRepository (test:pg). */
export const diagramRepositoryContract: ContractCase[] = [
  {
    name: "findAccessRole: the owner gets the owner role",
    run: async (f) => {
      const owner = await f.createUser();
      const diagram = await f.repo.create({ title: "D", ownerId: owner });

      assert.equal(await f.repo.findAccessRole(diagram.id, owner), "owner");
    },
  },
  ...(["editor", "viewer"] as const).map((role) => ({
    name: `findAccessRole: a diagram ${role} gets that role`,
    run: async (f: DiagramRepositoryFixture) => {
      const owner = await f.createUser();
      const member = await f.createUser();
      const diagram = await f.repo.create({ title: "D", ownerId: owner });
      await f.addDiagramMember(diagram.id, member, role);

      assert.equal(await f.repo.findAccessRole(diagram.id, member), role);
    },
  })),
  ...(
    [
      ["admin", "editor"],
      ["editor", "editor"],
      ["viewer", "viewer"],
    ] as const
  ).map(([workspaceRole, expected]) => ({
    name: `findAccessRole: a workspace ${workspaceRole} gets ${expected} on its diagrams`,
    run: async (f: DiagramRepositoryFixture) => {
      const owner = await f.createUser();
      const member = await f.createUser();
      const workspaceId = await f.createWorkspace(owner);
      await f.addWorkspaceMember(workspaceId, member, workspaceRole);
      const diagram = await f.repo.create({ title: "D", ownerId: owner, workspaceId });

      assert.equal(await f.repo.findAccessRole(diagram.id, member), expected);
    },
  })),
  {
    name: "findAccessRole: a diagram membership overrides the workspace role, even a higher one",
    run: async (f) => {
      const owner = await f.createUser();
      const member = await f.createUser();
      const workspaceId = await f.createWorkspace(owner);
      await f.addWorkspaceMember(workspaceId, member, "admin");
      const diagram = await f.repo.create({ title: "D", ownerId: owner, workspaceId });
      await f.addDiagramMember(diagram.id, member, "viewer");

      assert.equal(await f.repo.findAccessRole(diagram.id, member), "viewer");
    },
  },
  {
    name: "findAccessRole: a member of another workspace gets no role",
    run: async (f) => {
      const owner = await f.createUser();
      const member = await f.createUser();
      const workspaceA = await f.createWorkspace(owner);
      const workspaceB = await f.createWorkspace(owner);
      await f.addWorkspaceMember(workspaceA, member, "admin");
      const diagramInB = await f.repo.create({
        title: "D",
        ownerId: owner,
        workspaceId: workspaceB,
      });

      assert.equal(await f.repo.findAccessRole(diagramInB.id, member), null);
    },
  },
  {
    name: "findAccessRole: a stranger gets no role, nor does anyone on an unknown diagram",
    run: async (f) => {
      const owner = await f.createUser();
      const stranger = await f.createUser();
      const diagram = await f.repo.create({ title: "D", ownerId: owner });

      assert.equal(await f.repo.findAccessRole(diagram.id, stranger), null);
      assert.equal(await f.repo.findAccessRole(crypto.randomUUID(), owner), null);
    },
  },
  {
    name: "findByUser: lists owned, shared and workspace diagrams, each once",
    run: async (f) => {
      const { user } = await seedVisibility(f);

      assert.deepEqual(titles(await f.repo.findByUser(user)), [
        "Both",
        "Mine roadmap",
        "Shared ROADMAP",
        "Team roadmap",
      ]);
    },
  },
  {
    name: "findByUser: a workspace listing is scoped to that workspace",
    run: async (f) => {
      const { user, workspaceId } = await seedVisibility(f);

      assert.deepEqual(titles(await f.repo.findByUser(user, undefined, workspaceId)), [
        "Both",
        "Team roadmap",
      ]);
    },
  },
  {
    name: "findByUser: lists nothing to a user with no access",
    run: async (f) => {
      const { workspaceId } = await seedVisibility(f);
      const stranger = await f.createUser();

      assert.deepEqual(await f.repo.findByUser(stranger), []);
      assert.deepEqual(await f.repo.findByUser(stranger, undefined, workspaceId), []);
    },
  },
  {
    name: "findByUser: keeps another workspace's diagrams from a member of one workspace",
    run: async (f) => {
      const owner = await f.createUser();
      const member = await f.createUser();
      const workspaceA = await f.createWorkspace(owner);
      const workspaceB = await f.createWorkspace(owner);
      await f.addWorkspaceMember(workspaceA, member, "editor");
      await f.repo.create({ title: "In A", ownerId: owner, workspaceId: workspaceA });
      await f.repo.create({ title: "In B", ownerId: owner, workspaceId: workspaceB });

      assert.deepEqual(titles(await f.repo.findByUser(member)), ["In A"]);
      assert.deepEqual(await f.repo.findByUser(member, undefined, workspaceB), []);
    },
  },
  {
    name: "search: matches titles case-insensitively across owned, shared and workspace diagrams",
    run: async (f) => {
      const { user } = await seedVisibility(f);

      assert.deepEqual(titles(await f.repo.search(user, "roadMAP")), [
        "Mine roadmap",
        "Shared ROADMAP",
        "Team roadmap",
      ]);
    },
  },
  {
    name: "search: finds nothing for a user with no access to the matches",
    run: async (f) => {
      await seedVisibility(f);
      const stranger = await f.createUser();

      assert.deepEqual(await f.repo.search(stranger, "roadmap"), []);
    },
  },
  ...[
    ["100% done", "1000 done", "0%"],
    ["snake_case", "snakeXcase", "e_c"],
    [String.raw`a\b`, "ab", String.raw`a\b`],
  ].map(([title, decoy, term]) => ({
    name: `search: treats ${term} in a search term literally`,
    run: async (f: DiagramRepositoryFixture) => {
      const owner = await f.createUser();
      await f.repo.create({ title, ownerId: owner });
      await f.repo.create({ title: decoy, ownerId: owner });

      assert.deepEqual(titles(await f.repo.search(owner, term)), [title]);
    },
  })),
];

import { describe, it } from "node:test";
import {
  diagramRepositoryContract,
  type DiagramRepositoryFixture,
} from "../contracts/diagram-repository-contract";
import { PgDiagramRepository } from "../../infrastructure/persistence/pg-diagram-repository";
import { addDiagramMember, addWorkspaceMember, createUser, createWorkspace } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const fixture: DiagramRepositoryFixture = {
  repo: new PgDiagramRepository(),
  createUser: () => createUser(),
  createWorkspace: (ownerId) => createWorkspace(ownerId),
  addWorkspaceMember,
  addDiagramMember,
};

describe("PgDiagramRepository contract", () => {
  for (const { name, run } of diagramRepositoryContract) {
    it(name, () => run(fixture));
  }
});

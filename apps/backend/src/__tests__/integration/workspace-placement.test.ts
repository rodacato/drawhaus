import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { GetCurrentUserUseCase } from "../../application/use-cases/auth/get-current-user";
import { CreateDiagramUseCase } from "../../application/use-cases/diagrams/create-diagram";
import { CreateTemplateUseCase } from "../../application/use-cases/templates/create-template";
import { ListTemplatesUseCase } from "../../application/use-cases/templates/list-templates";
import { UseTemplateUseCase } from "../../application/use-cases/templates/use-template";
import { createDiagramRoutes } from "../../infrastructure/http/routes/diagram.routes";
import { createTemplateRoutes } from "../../infrastructure/http/routes/template.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryTemplateRepository } from "../fakes/in-memory-template-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { InMemoryFolderRepository } from "../fakes/in-memory-folder-repository";

type DiagramUseCases = Parameters<typeof createDiagramRoutes>[0];
type TemplateUseCases = Parameters<typeof createTemplateRoutes>[0];

let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;
let diagrams: InMemoryDiagramRepository;
let templates: InMemoryTemplateRepository;
let workspaces: InMemoryWorkspaceRepository;
let folders: InMemoryFolderRepository;
let app: express.Express;

beforeEach(() => {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
  diagrams = new InMemoryDiagramRepository();
  templates = new InMemoryTemplateRepository();
  workspaces = new InMemoryWorkspaceRepository();
  folders = new InMemoryFolderRepository();

  const requireAuth = createRequireAuth(new GetCurrentUserUseCase(sessions));
  app = express();
  app.use(express.json());
  // Only the create/list/use routes are exercised; the rest of each router is irrelevant here.
  app.use(
    "/api/diagrams",
    createDiagramRoutes(
      {
        create: new CreateDiagramUseCase(diagrams, workspaces, folders),
      } as unknown as DiagramUseCases,
      requireAuth,
    ),
  );
  app.use(
    "/api/templates",
    createTemplateRoutes(
      {
        create: new CreateTemplateUseCase(templates, workspaces),
        list: new ListTemplatesUseCase(templates, workspaces),
        use: new UseTemplateUseCase(templates, diagrams, workspaces, folders),
      } as unknown as TemplateUseCases,
      requireAuth,
    ),
  );
});

async function signIn(email: string) {
  const user = await users.create({ email, name: email, passwordHash: "h" });
  const session = await sessions.create(user.id);
  return { userId: user.id, cookie: `drawhaus_session=${session.token}` };
}

function workspaceTemplate(creatorId: string, workspaceId: string, title: string) {
  return templates.create({
    creatorId,
    workspaceId,
    title,
    description: "",
    category: "general",
    elements: [{ id: "e1" }],
    appState: {},
  });
}

test("POST /api/diagrams into a workspace the user is not a member of is 403", async () => {
  const owner = await signIn("owner@example.com");
  const intruder = await signIn("intruder@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: owner.userId });

  const res = await request(app)
    .post("/api/diagrams")
    .set("Cookie", intruder.cookie)
    .send({ title: "Planted", workspaceId: ws.id });

  assert.equal(res.status, 403);
  assert.equal(diagrams.store.length, 0);
});

test("POST /api/diagrams into a member workspace or the personal space is 201", async () => {
  const member = await signIn("member@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "someone-else" });
  await workspaces.addMember(ws.id, member.userId, "editor");

  const inWorkspace = await request(app)
    .post("/api/diagrams")
    .set("Cookie", member.cookie)
    .send({ workspaceId: ws.id });
  const personal = await request(app).post("/api/diagrams").set("Cookie", member.cookie).send({});

  assert.equal(inWorkspace.status, 201);
  assert.equal(inWorkspace.body.diagram.workspaceId, ws.id);
  assert.equal(personal.status, 201);
  assert.equal(personal.body.diagram.workspaceId, null);
});

test("POST /api/diagrams with a folder of another workspace is 403", async () => {
  const user = await signIn("user@example.com");
  const mine = await workspaces.create({ name: "Mine", ownerId: user.userId });
  const theirs = await workspaces.create({ name: "Theirs", ownerId: "someone-else" });
  const folder = await folders.create({
    ownerId: "someone-else",
    workspaceId: theirs.id,
    name: "Private",
  });

  const res = await request(app)
    .post("/api/diagrams")
    .set("Cookie", user.cookie)
    .send({ workspaceId: mine.id, folderId: folder.id });

  assert.equal(res.status, 403);
  assert.equal(diagrams.store.length, 0);
});

test("templates: creating in or listing a foreign workspace is 403", async () => {
  const owner = await signIn("owner@example.com");
  const intruder = await signIn("intruder@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: owner.userId });
  await workspaceTemplate(owner.userId, ws.id, "Secret");

  const created = await request(app)
    .post("/api/templates")
    .set("Cookie", intruder.cookie)
    .send({ title: "Planted", workspaceId: ws.id, elements: [], appState: {} });
  const listed = await request(app)
    .get("/api/templates")
    .query({ workspaceId: ws.id })
    .set("Cookie", intruder.cookie);

  assert.equal(created.status, 403);
  assert.equal(listed.status, 403);
  assert.equal(templates.store.length, 1);
});

test("templates: a member lists the workspace's templates", async () => {
  const member = await signIn("member@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: member.userId });
  await workspaceTemplate("someone-else", ws.id, "Shared");

  const res = await request(app)
    .get("/api/templates")
    .query({ workspaceId: ws.id })
    .set("Cookie", member.cookie);

  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.templates.map((t: { title: string }) => t.title),
    ["Shared"],
  );
});

test("POST /api/templates/:id/use into a foreign workspace is 403 and creates nothing", async () => {
  const owner = await signIn("owner@example.com");
  const intruder = await signIn("intruder@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: owner.userId });
  const template = await workspaceTemplate(intruder.userId, ws.id, "Any");

  const res = await request(app)
    .post(`/api/templates/${template.id}/use`)
    .set("Cookie", intruder.cookie)
    .send({ workspaceId: ws.id });

  assert.equal(res.status, 403);
  assert.equal(diagrams.store.length, 0);
});

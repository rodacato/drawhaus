import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { RegisterUseCase } from "../../application/use-cases/auth/register";
import { LoginUseCase } from "../../application/use-cases/auth/login";
import { LogoutUseCase } from "../../application/use-cases/auth/logout";
import { GetCurrentUserUseCase } from "../../application/use-cases/auth/get-current-user";
import { UpdateProfileUseCase } from "../../application/use-cases/auth/update-profile";
import { ChangePasswordUseCase } from "../../application/use-cases/auth/change-password";
import { AcceptInviteUseCase } from "../../application/use-cases/auth/accept-invite";
import { ForgotPasswordUseCase } from "../../application/use-cases/auth/forgot-password";
import { ResetPasswordUseCase } from "../../application/use-cases/auth/reset-password";
import { DeleteAccountUseCase } from "../../application/use-cases/auth/delete-account";
import { GoogleAuthUseCase } from "../../application/use-cases/auth/google-auth";
import { GitHubAuthUseCase } from "../../application/use-cases/auth/github-auth";
import { UnlinkOAuthUseCase } from "../../application/use-cases/auth/unlink-oauth";
import { CreateTemplateUseCase } from "../../application/use-cases/templates/create-template";
import { GetTemplateUseCase } from "../../application/use-cases/templates/get-template";
import { ListTemplatesUseCase } from "../../application/use-cases/templates/list-templates";
import { UpdateTemplateUseCase } from "../../application/use-cases/templates/update-template";
import { DeleteTemplateUseCase } from "../../application/use-cases/templates/delete-template";
import { UseTemplateUseCase } from "../../application/use-cases/templates/use-template";
import { TransferTemplateOwnershipUseCase } from "../../application/use-cases/templates/transfer-ownership";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createTemplateRoutes } from "../../infrastructure/http/routes/template.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryTemplateRepository } from "../fakes/in-memory-template-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryFolderRepository } from "../fakes/in-memory-folder-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";
import { InMemoryDriveBackupRepository } from "../fakes/in-memory-drive-backup-repository";
import { InMemorySiteSettingsRepository } from "../fakes/in-memory-site-settings-repository";
import { FakeOAuthProvider } from "../fakes/fake-oauth-provider";

let templates: InMemoryTemplateRepository;
let diagrams: InMemoryDiagramRepository;
let workspaces: InMemoryWorkspaceRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  templates = new InMemoryTemplateRepository();
  diagrams = new InMemoryDiagramRepository();
  workspaces = new InMemoryWorkspaceRepository();
  const hasher = new FakeHasher();

  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());

  const invitations = new InMemoryInvitationRepository();
  const passwordResets = new InMemoryPasswordResetRepository();
  const emailService = new NoopEmailService();
  app.use(
    "/api/auth",
    createAuthRoutes(
      {
        register: new RegisterUseCase(
          users,
          sessions,
          hasher,
          new InMemorySiteSettingsRepository(),
        ),
        login: new LoginUseCase(users, sessions, hasher, new NoopAuditLogger()),
        logout: new LogoutUseCase(sessions),
        getCurrentUser,
        updateProfile: new UpdateProfileUseCase(users),
        changePassword: new ChangePasswordUseCase(users, hasher),
        acceptInvite: new AcceptInviteUseCase(users, sessions, invitations, hasher),
        forgotPassword: new ForgotPasswordUseCase(users, passwordResets, emailService),
        resetPassword: new ResetPasswordUseCase(users, sessions, passwordResets, hasher),
        deleteAccount: new DeleteAccountUseCase(users, hasher, new NoopAuditLogger(), workspaces),
        googleAuth: new GoogleAuthUseCase(
          users,
          sessions,
          new InMemoryOAuthTokenRepository(),
          new InMemorySiteSettingsRepository(),
          new FakeOAuthProvider(),
        ),
        githubAuth: new GitHubAuthUseCase(
          users,
          sessions,
          new InMemoryOAuthTokenRepository(),
          new InMemorySiteSettingsRepository(),
          new FakeOAuthProvider(),
        ),
        unlinkOAuth: new UnlinkOAuthUseCase(
          users,
          new InMemoryOAuthTokenRepository(),
          new InMemoryDriveBackupRepository(),
        ),
      },
      requireAuth,
    ),
  );

  app.use(
    "/api/templates",
    createTemplateRoutes(
      {
        create: new CreateTemplateUseCase(templates, workspaces),
        get: new GetTemplateUseCase(templates, workspaces),
        list: new ListTemplatesUseCase(templates, workspaces),
        update: new UpdateTemplateUseCase(templates, workspaces),
        delete: new DeleteTemplateUseCase(templates, workspaces),
        use: new UseTemplateUseCase(
          templates,
          diagrams,
          workspaces,
          new InMemoryFolderRepository(),
        ),
        transferOwnership: new TransferTemplateOwnershipUseCase(
          templates,
          workspaces,
          new NoopAuditLogger(),
        ),
      },
      requireAuth,
    ),
  );

  return app;
}

async function registerAndGetUser(app: express.Express, email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email,
      name: email.split("@")[0],
      password: "password123",
    });
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { cookie, userId: res.body.user.id as string };
}

async function workspaceTemplate(creatorId: string) {
  const ws = await workspaces.create({ name: "Team", ownerId: creatorId });
  const template = await templates.create({
    creatorId,
    workspaceId: ws.id,
    title: "Shared",
    description: "",
    category: "general",
    elements: [{ id: "e1" }],
    appState: {},
  });
  return { ws, template };
}

beforeEach(() => {
  templates = new InMemoryTemplateRepository();
  diagrams = new InMemoryDiagramRepository();
  workspaces = new InMemoryWorkspaceRepository();
});

test("POST /api/templates creates a template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpl1@example.com");

  const res = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({
      title: "Sprint Board",
      description: "Kanban layout",
      category: "planning",
      elements: [{ id: "e1" }],
      appState: { theme: "light" },
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.template.title, "Sprint Board");
  assert.equal(res.body.template.category, "planning");
  assert.equal(res.body.template.isBuiltIn, false);
  assert.equal(res.body.template.usageCount, 0);
});

test("GET /api/templates lists user's templates", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpl2@example.com");

  await request(app).post("/api/templates").set("Cookie", cookie).send({
    title: "A",
    elements: [],
    appState: {},
  });
  await request(app).post("/api/templates").set("Cookie", cookie).send({
    title: "B",
    elements: [],
    appState: {},
  });

  const res = await request(app).get("/api/templates").set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.templates.length, 2);
});

test("GET /api/templates/:id returns a single template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpl3@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({ title: "Single", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const res = await request(app).get(`/api/templates/${tplId}`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.template.id, tplId);
  assert.equal(res.body.template.title, "Single");
});

test("GET /api/templates/:id returns 404 for unknown template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpl4@example.com");

  const res = await request(app)
    .get("/api/templates/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("PATCH /api/templates/:id updates an owned template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpl5@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({ title: "Original", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const res = await request(app)
    .patch(`/api/templates/${tplId}`)
    .set("Cookie", cookie)
    .send({ title: "Renamed", description: "new desc" });

  assert.equal(res.status, 200);
  assert.equal(res.body.template.title, "Renamed");
  assert.equal(res.body.template.description, "new desc");
});

test("PATCH and DELETE /api/templates/:id are 404 for a template the user cannot read", async () => {
  const app = createApp();
  const { cookie: aliceCookie } = await registerAndGetUser(app, "tplao@example.com");
  const { cookie: bobCookie } = await registerAndGetUser(app, "tplbo@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", aliceCookie)
    .send({ title: "Mine", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const patched = await request(app)
    .patch(`/api/templates/${tplId}`)
    .set("Cookie", bobCookie)
    .send({ title: "Hacked" });
  const deleted = await request(app).delete(`/api/templates/${tplId}`).set("Cookie", bobCookie);

  assert.equal(patched.status, 404);
  assert.equal(deleted.status, 404);
  assert.deepEqual(
    templates.store.map((t) => t.title),
    ["Mine"],
  );
});

test("PATCH and DELETE /api/templates/:id are 403 for a workspace member who did not create it", async () => {
  const app = createApp();
  const alice = await registerAndGetUser(app, "tplwa@example.com");
  const bob = await registerAndGetUser(app, "tplwb@example.com");
  const { ws, template } = await workspaceTemplate(alice.userId);
  await workspaces.addMember(ws.id, bob.userId, "admin");

  const patched = await request(app)
    .patch(`/api/templates/${template.id}`)
    .set("Cookie", bob.cookie)
    .send({ title: "Renamed" });
  const deleted = await request(app)
    .delete(`/api/templates/${template.id}`)
    .set("Cookie", bob.cookie);

  assert.equal(patched.status, 403);
  assert.equal(deleted.status, 403);
  assert.deepEqual(
    templates.store.map((t) => t.title),
    ["Shared"],
  );
});

test("PATCH /api/templates/:id rejects empty body with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tplem@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({ title: "X", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const res = await request(app).patch(`/api/templates/${tplId}`).set("Cookie", cookie).send({});

  assert.equal(res.status, 400);
});

test("DELETE /api/templates/:id deletes an owned template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpldel@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({ title: "Doomed", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const res = await request(app).delete(`/api/templates/${tplId}`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("POST /api/templates/:id/use creates a diagram from a template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tpluse@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({
      title: "Starter",
      elements: [{ id: "e1" }],
      appState: { zoom: 1 },
    });
  const tplId = create.body.template.id as string;

  const res = await request(app)
    .post(`/api/templates/${tplId}/use`)
    .set("Cookie", cookie)
    .send({ title: "From Template" });

  assert.equal(res.status, 201);
  assert.equal(res.body.diagram.title, "From Template");
  assert.equal(diagrams.store.length, 1);
});

test("POST /api/templates/:id/use returns 404 for unknown template", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tplun@example.com");

  const res = await request(app)
    .post("/api/templates/00000000-0000-0000-0000-000000000000/use")
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 404);
});

test("POST /api/templates rejects missing elements field with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tplv1@example.com");

  const res = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({ title: "X", appState: {} });

  assert.equal(res.status, 400);
});

test("POST /api/templates/transfer-ownership transfers to another user", async () => {
  const app = createApp();
  const { cookie: aliceCookie } = await registerAndGetUser(app, "tplta@example.com");
  const { userId: bobId } = await registerAndGetUser(app, "tpltb@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", aliceCookie)
    .send({ title: "X", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const res = await request(app)
    .post("/api/templates/transfer-ownership")
    .set("Cookie", aliceCookie)
    .send({ templateIds: [tplId], newCreatorId: bobId });

  assert.equal(res.status, 200);
  const stored = templates.store.find((t) => t.id === tplId)!;
  assert.equal(stored.creatorId, bobId);
});

test("POST /api/templates/transfer-ownership returns 403 when transferring to self", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "tplself@example.com");

  const create = await request(app)
    .post("/api/templates")
    .set("Cookie", cookie)
    .send({ title: "X", elements: [], appState: {} });
  const tplId = create.body.template.id as string;

  const res = await request(app)
    .post("/api/templates/transfer-ownership")
    .set("Cookie", cookie)
    .send({ templateIds: [tplId], newCreatorId: userId });

  assert.equal(res.status, 403);
});

test("GET /api/templates without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/templates");
  assert.equal(res.status, 401);
});

test("GET /api/templates/:id returns a workspace template to a member who did not create it", async () => {
  const app = createApp();
  const alice = await registerAndGetUser(app, "tplra@example.com");
  const bob = await registerAndGetUser(app, "tplrb@example.com");
  const { ws, template } = await workspaceTemplate(alice.userId);
  await workspaces.addMember(ws.id, bob.userId, "viewer");

  const res = await request(app).get(`/api/templates/${template.id}`).set("Cookie", bob.cookie);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.template.elements, template.elements);
});

test("GET /api/templates/:id is 404 for a template the user cannot read", async () => {
  const app = createApp();
  const alice = await registerAndGetUser(app, "tplsa@example.com");
  const stranger = await registerAndGetUser(app, "tplsb@example.com");
  const { template: shared } = await workspaceTemplate(alice.userId);
  const personal = await request(app)
    .post("/api/templates")
    .set("Cookie", alice.cookie)
    .send({ title: "Personal", elements: [{ id: "secret" }], appState: {} });

  for (const id of [shared.id, personal.body.template.id as string]) {
    const res = await request(app).get(`/api/templates/${id}`).set("Cookie", stranger.cookie);
    assert.equal(res.status, 404);
    assert.equal(res.body.template, undefined);
  }
});

test("POST /api/templates/:id/use copies a workspace template for a member", async () => {
  const app = createApp();
  const alice = await registerAndGetUser(app, "tplma@example.com");
  const bob = await registerAndGetUser(app, "tplmb@example.com");
  const { ws, template } = await workspaceTemplate(alice.userId);
  await workspaces.addMember(ws.id, bob.userId, "viewer");

  const res = await request(app)
    .post(`/api/templates/${template.id}/use`)
    .set("Cookie", bob.cookie)
    .send({});

  assert.equal(res.status, 201);
  assert.equal(diagrams.store.length, 1);
  assert.deepEqual(diagrams.store[0].elements, template.elements);
});

test("POST /api/templates/:id/use of a template the user cannot read is 404 and creates nothing", async () => {
  const app = createApp();
  const alice = await registerAndGetUser(app, "tplxa@example.com");
  const stranger = await registerAndGetUser(app, "tplxb@example.com");
  const { template } = await workspaceTemplate(alice.userId);

  const res = await request(app)
    .post(`/api/templates/${template.id}/use`)
    .set("Cookie", stranger.cookie)
    .send({ title: "Copied" });

  assert.equal(res.status, 404);
  assert.equal(diagrams.store.length, 0);
  assert.equal(template.usageCount, 0);
});

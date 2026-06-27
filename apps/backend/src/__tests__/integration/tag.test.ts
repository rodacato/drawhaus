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
import { CreateTagUseCase } from "../../application/use-cases/tags/create-tag";
import { ListTagsUseCase } from "../../application/use-cases/tags/list-tags";
import { UpdateTagUseCase } from "../../application/use-cases/tags/update-tag";
import { DeleteTagUseCase } from "../../application/use-cases/tags/delete-tag";
import { AssignTagUseCase } from "../../application/use-cases/tags/assign-tag";
import { UnassignTagUseCase } from "../../application/use-cases/tags/unassign-tag";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createTagRoutes } from "../../infrastructure/http/routes/tag.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryTagRepository } from "../fakes/in-memory-tag-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
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

let tags: InMemoryTagRepository;
let diagrams: InMemoryDiagramRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const workspaces = new InMemoryWorkspaceRepository();
  tags = new InMemoryTagRepository();
  diagrams = new InMemoryDiagramRepository();
  const hasher = new FakeHasher();

  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());

  const invitations = new InMemoryInvitationRepository();
  const passwordResets = new InMemoryPasswordResetRepository();
  const emailService = new NoopEmailService();
  app.use("/api/auth", createAuthRoutes({
    register: new RegisterUseCase(users, sessions, hasher, new InMemorySiteSettingsRepository()),
    login: new LoginUseCase(users, sessions, hasher, new NoopAuditLogger()),
    logout: new LogoutUseCase(sessions),
    getCurrentUser,
    updateProfile: new UpdateProfileUseCase(users),
    changePassword: new ChangePasswordUseCase(users, hasher),
    acceptInvite: new AcceptInviteUseCase(users, sessions, invitations, hasher),
    forgotPassword: new ForgotPasswordUseCase(users, passwordResets, emailService),
    resetPassword: new ResetPasswordUseCase(users, sessions, passwordResets, hasher),
    deleteAccount: new DeleteAccountUseCase(users, hasher, new NoopAuditLogger(), workspaces),
    googleAuth: new GoogleAuthUseCase(users, sessions, new InMemoryOAuthTokenRepository(), new InMemorySiteSettingsRepository(), new FakeOAuthProvider()),
    githubAuth: new GitHubAuthUseCase(users, sessions, new InMemoryOAuthTokenRepository(), new InMemorySiteSettingsRepository(), new FakeOAuthProvider()),
    unlinkOAuth: new UnlinkOAuthUseCase(users, new InMemoryOAuthTokenRepository(), new InMemoryDriveBackupRepository()),
  }, requireAuth));

  app.use("/api/tags", createTagRoutes({
    create: new CreateTagUseCase(tags),
    list: new ListTagsUseCase(tags),
    update: new UpdateTagUseCase(tags),
    delete: new DeleteTagUseCase(tags),
    assign: new AssignTagUseCase(tags, diagrams),
    unassign: new UnassignTagUseCase(tags, diagrams),
  }, requireAuth));

  return app;
}

async function registerAndGetUser(app: express.Express, email: string) {
  const res = await request(app).post("/api/auth/register").send({
    email,
    name: email.split("@")[0],
    password: "password123",
  });
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { cookie, userId: res.body.user.id as string };
}

beforeEach(() => {
  tags = new InMemoryTagRepository();
  diagrams = new InMemoryDiagramRepository();
});

test("POST /api/tags creates a tag with default color", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tag1@example.com");

  const res = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "Urgent" });

  assert.equal(res.status, 201);
  assert.equal(res.body.tag.name, "Urgent");
  assert.equal(res.body.tag.color, "#6B7280");
  assert.ok(res.body.tag.id);
});

test("POST /api/tags accepts custom color", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tag2@example.com");

  const res = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "Red", color: "#ff0000" });

  assert.equal(res.status, 201);
  assert.equal(res.body.tag.color, "#ff0000");
});

test("GET /api/tags returns user's tags", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tag3@example.com");

  await request(app).post("/api/tags").set("Cookie", cookie).send({ name: "Alpha" });
  await request(app).post("/api/tags").set("Cookie", cookie).send({ name: "Beta" });

  const res = await request(app).get("/api/tags").set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.tags.length, 2);
});

test("GET /api/tags isolates tags per user", async () => {
  const app = createApp();
  const { cookie: alice } = await registerAndGetUser(app, "talice@example.com");
  const { cookie: bob } = await registerAndGetUser(app, "tbob@example.com");

  await request(app).post("/api/tags").set("Cookie", alice).send({ name: "Alice-Tag" });

  const aliceList = await request(app).get("/api/tags").set("Cookie", alice);
  const bobList = await request(app).get("/api/tags").set("Cookie", bob);

  assert.equal(aliceList.body.tags.length, 1);
  assert.equal(bobList.body.tags.length, 0);
});

test("PATCH /api/tags/:id updates the tag", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tag5@example.com");

  const create = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "Original" });
  const tagId = create.body.tag.id as string;

  const res = await request(app)
    .patch(`/api/tags/${tagId}`)
    .set("Cookie", cookie)
    .send({ name: "Updated", color: "#abcdef" });

  assert.equal(res.status, 200);
  assert.equal(res.body.tag.name, "Updated");
  assert.equal(res.body.tag.color, "#abcdef");
});

test("PATCH /api/tags/:id rejects empty body with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tag6@example.com");

  const create = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "X" });
  const tagId = create.body.tag.id as string;

  const res = await request(app)
    .patch(`/api/tags/${tagId}`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 400);
});

test("DELETE /api/tags/:id removes the tag", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tag7@example.com");

  const create = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "Trash" });
  const tagId = create.body.tag.id as string;

  const res = await request(app).delete(`/api/tags/${tagId}`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const list = await request(app).get("/api/tags").set("Cookie", cookie);
  assert.equal(list.body.tags.length, 0);
});

test("POST /api/tags/:id/assign attaches a tag to an owned diagram", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "tag8@example.com");

  const tagRes = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "Pinned" });
  const tagId = tagRes.body.tag.id as string;

  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/tags/${tagId}/assign`)
    .set("Cookie", cookie)
    .send({ diagramId: diagram.id });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(tags.assignments.length, 1);
  assert.equal(tags.assignments[0].tagId, tagId);
  assert.equal(tags.assignments[0].diagramId, diagram.id);
});

test("POST /api/tags/:id/assign returns 403 when user is a viewer of the diagram", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "tagforbid@example.com");
  const tagRes = await request(app).post("/api/tags").set("Cookie", cookie).send({ name: "T" });
  const tagId = tagRes.body.tag.id as string;

  const diagram = await diagrams.create({ ownerId: "other-user-id", title: "D" });
  diagrams.members.push({ diagramId: diagram.id, userId, role: "viewer" });

  const res = await request(app)
    .post(`/api/tags/${tagId}/assign`)
    .set("Cookie", cookie)
    .send({ diagramId: diagram.id });

  assert.equal(res.status, 403);
});

test("POST /api/tags/:id/assign returns 404 when tag does not belong to user", async () => {
  const app = createApp();
  const { cookie: aliceCookie } = await registerAndGetUser(app, "ta1@example.com");
  const { cookie: bobCookie, userId: bobId } = await registerAndGetUser(app, "tb1@example.com");

  const tagRes = await request(app).post("/api/tags").set("Cookie", aliceCookie).send({ name: "Alices" });
  const tagId = tagRes.body.tag.id as string;

  const bobDiagram = await diagrams.create({ ownerId: bobId, title: "Bobs" });

  const res = await request(app)
    .post(`/api/tags/${tagId}/assign`)
    .set("Cookie", bobCookie)
    .send({ diagramId: bobDiagram.id });

  assert.equal(res.status, 404);
});

test("POST /api/tags/:id/unassign removes a tag-diagram link", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "tagun@example.com");

  const tagRes = await request(app).post("/api/tags").set("Cookie", cookie).send({ name: "T" });
  const tagId = tagRes.body.tag.id as string;

  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  await tags.assignToDiagram(diagram.id, tagId);

  const res = await request(app)
    .post(`/api/tags/${tagId}/unassign`)
    .set("Cookie", cookie)
    .send({ diagramId: diagram.id });

  assert.equal(res.status, 200);
  assert.equal(tags.assignments.length, 0);
});

test("POST /api/tags/:id/assign with non-uuid diagramId returns 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tagval@example.com");

  const tagRes = await request(app).post("/api/tags").set("Cookie", cookie).send({ name: "T" });
  const tagId = tagRes.body.tag.id as string;

  const res = await request(app)
    .post(`/api/tags/${tagId}/assign`)
    .set("Cookie", cookie)
    .send({ diagramId: "not-a-uuid" });

  assert.equal(res.status, 400);
});

test("POST /api/tags rejects empty name with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "tagvname@example.com");

  const res = await request(app)
    .post("/api/tags")
    .set("Cookie", cookie)
    .send({ name: "" });

  assert.equal(res.status, 400);
});

test("GET /api/tags without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/tags");
  assert.equal(res.status, 401);
});

test("POST /api/tags without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).post("/api/tags").send({ name: "X" });
  assert.equal(res.status, 401);
});

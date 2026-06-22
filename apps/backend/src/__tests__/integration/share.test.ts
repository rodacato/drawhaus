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
import { CreateShareLinkUseCase } from "../../application/use-cases/share/create-link";
import { ResolveLinkUseCase } from "../../application/use-cases/share/resolve-link";
import { ListLinksUseCase } from "../../application/use-cases/share/list-links";
import { DeleteLinkUseCase } from "../../application/use-cases/share/delete-link";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createShareRoutes } from "../../infrastructure/http/routes/share.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryShareRepository } from "../fakes/in-memory-share-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";

let diagrams: InMemoryDiagramRepository;
let shares: InMemoryShareRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const workspaces = new InMemoryWorkspaceRepository();
  diagrams = new InMemoryDiagramRepository();
  shares = new InMemoryShareRepository();
  const hasher = new FakeHasher();

  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());

  const invitations = new InMemoryInvitationRepository();
  const passwordResets = new InMemoryPasswordResetRepository();
  const emailService = new NoopEmailService();
  app.use("/api/auth", createAuthRoutes({
    register: new RegisterUseCase(users, sessions, hasher),
    login: new LoginUseCase(users, sessions, hasher, new NoopAuditLogger()),
    logout: new LogoutUseCase(sessions),
    getCurrentUser,
    updateProfile: new UpdateProfileUseCase(users),
    changePassword: new ChangePasswordUseCase(users, hasher),
    acceptInvite: new AcceptInviteUseCase(users, sessions, invitations, hasher),
    forgotPassword: new ForgotPasswordUseCase(users, passwordResets, emailService),
    resetPassword: new ResetPasswordUseCase(users, sessions, passwordResets, hasher),
    deleteAccount: new DeleteAccountUseCase(users, hasher, new NoopAuditLogger(), workspaces),
    googleAuth: new GoogleAuthUseCase(users, sessions, new InMemoryOAuthTokenRepository()),
    githubAuth: new GitHubAuthUseCase(users, sessions, new InMemoryOAuthTokenRepository()),
    unlinkOAuth: new UnlinkOAuthUseCase(users, new InMemoryOAuthTokenRepository()),
  }, requireAuth));

  app.use("/api/share", createShareRoutes({
    createLink: new CreateShareLinkUseCase(shares, diagrams),
    resolveLink: new ResolveLinkUseCase(shares, diagrams),
    listLinks: new ListLinksUseCase(shares, diagrams),
    deleteLink: new DeleteLinkUseCase(shares),
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
  diagrams = new InMemoryDiagramRepository();
  shares = new InMemoryShareRepository();
});

test("POST /api/share/:diagramId creates a viewer link by default", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh1@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/share/${diagram.id}`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 201);
  assert.equal(res.body.shareLink.diagramId, diagram.id);
  assert.equal(res.body.shareLink.role, "viewer");
  assert.equal(res.body.shareLink.expiresAt, null);
  assert.ok(typeof res.body.shareLink.token === "string" && res.body.shareLink.token.length > 0);
});

test("POST /api/share/:diagramId honors role and expiresInHours", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh2@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/share/${diagram.id}`)
    .set("Cookie", cookie)
    .send({ role: "editor", expiresInHours: 24 });

  assert.equal(res.status, 201);
  assert.equal(res.body.shareLink.role, "editor");
  assert.ok(typeof res.body.shareLink.expiresAt === "string");
});

test("POST /api/share/:diagramId returns 404 when diagram does not exist", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "sh3@example.com");

  const res = await request(app)
    .post("/api/share/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 404);
});

test("POST /api/share/:diagramId returns 403 when viewer tries to create link", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh4@example.com");
  const diagram = await diagrams.create({ ownerId: "owner-id", title: "D" });
  diagrams.members.push({ diagramId: diagram.id, userId, role: "viewer" });

  const res = await request(app)
    .post(`/api/share/${diagram.id}`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 403);
});

test("POST /api/share/:diagramId rejects invalid role with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh5@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/share/${diagram.id}`)
    .set("Cookie", cookie)
    .send({ role: "admin" });

  assert.equal(res.status, 400);
});

test("POST /api/share/:diagramId rejects out-of-range expiresInHours with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh6@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/share/${diagram.id}`)
    .set("Cookie", cookie)
    .send({ expiresInHours: 10_000 });

  assert.equal(res.status, 400);
});

test("GET /api/share/:diagramId/links lists owner's links", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh7@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  await request(app).post(`/api/share/${diagram.id}`).set("Cookie", cookie).send({ role: "editor" });
  await request(app).post(`/api/share/${diagram.id}`).set("Cookie", cookie).send({ role: "viewer" });

  const res = await request(app).get(`/api/share/${diagram.id}/links`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.links.length, 2);
});

test("GET /api/share/:diagramId/links returns 404 for non-owner", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "shown@example.com");
  const { cookie: otherCookie } = await registerAndGetUser(app, "shoth@example.com");
  const diagram = await diagrams.create({ ownerId, title: "D" });
  await request(app).post(`/api/share/${diagram.id}`).set("Cookie", ownerCookie).send({});

  const res = await request(app).get(`/api/share/${diagram.id}/links`).set("Cookie", otherCookie);
  assert.equal(res.status, 404);
});

test("GET /api/share/link/:token resolves public link", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh8@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "Public Doc" });

  const createRes = await request(app).post(`/api/share/${diagram.id}`).set("Cookie", cookie).send({});
  const token = createRes.body.shareLink.token as string;

  const res = await request(app).get(`/api/share/link/${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.share.role, "viewer");
  assert.equal(res.body.diagram.id, diagram.id);
  assert.equal(res.body.diagram.title, "Public Doc");
});

test("GET /api/share/link/:token returns 404 for unknown token", async () => {
  const app = createApp();
  const res = await request(app).get("/api/share/link/unknown-token");
  assert.equal(res.status, 404);
});

test("GET /api/share/link/:token returns 410 for expired link", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "sh9@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "Expired" });

  const createRes = await request(app).post(`/api/share/${diagram.id}`).set("Cookie", cookie).send({});
  const token = createRes.body.shareLink.token as string;

  // Force expiration
  const link = shares.store.find((l) => l.token === token)!;
  link.expiresAt = new Date(Date.now() - 1000);

  const res = await request(app).get(`/api/share/link/${token}`);
  assert.equal(res.status, 410);
});

test("DELETE /api/share/link/:token deletes a link created by user", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "shd1@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const createRes = await request(app).post(`/api/share/${diagram.id}`).set("Cookie", cookie).send({});
  const token = createRes.body.shareLink.token as string;

  const res = await request(app).delete(`/api/share/link/${token}`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  assert.equal(shares.store.find((l) => l.token === token), undefined);
});

test("DELETE /api/share/link/:token returns 404 when user did not create the link", async () => {
  const app = createApp();
  const { cookie: aliceCookie, userId: aliceId } = await registerAndGetUser(app, "shdela@example.com");
  const { cookie: bobCookie } = await registerAndGetUser(app, "shdelb@example.com");
  const diagram = await diagrams.create({ ownerId: aliceId, title: "D" });

  const createRes = await request(app).post(`/api/share/${diagram.id}`).set("Cookie", aliceCookie).send({});
  const token = createRes.body.shareLink.token as string;

  const res = await request(app).delete(`/api/share/link/${token}`).set("Cookie", bobCookie);
  assert.equal(res.status, 404);
});

test("POST /api/share/:diagramId without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).post("/api/share/00000000-0000-0000-0000-000000000000").send({});
  assert.equal(res.status, 401);
});

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
import { ListCommentsUseCase } from "../../application/use-cases/comments/list-comments";
import { CreateCommentUseCase } from "../../application/use-cases/comments/create-comment";
import { ReplyCommentUseCase } from "../../application/use-cases/comments/reply-comment";
import { ResolveCommentUseCase } from "../../application/use-cases/comments/resolve-comment";
import { DeleteCommentUseCase } from "../../application/use-cases/comments/delete-comment";
import { ToggleLikeUseCase } from "../../application/use-cases/comments/toggle-like";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createCommentRoutes } from "../../infrastructure/http/routes/comment.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryCommentRepository } from "../fakes/in-memory-comment-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";

let comments: InMemoryCommentRepository;
let diagrams: InMemoryDiagramRepository;
let userStore: InMemoryUserRepository;

function createApp() {
  userStore = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => userStore.store);
  const workspaces = new InMemoryWorkspaceRepository();
  diagrams = new InMemoryDiagramRepository();
  comments = new InMemoryCommentRepository(() => userStore.store);
  const hasher = new FakeHasher();

  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());

  const invitations = new InMemoryInvitationRepository();
  const passwordResets = new InMemoryPasswordResetRepository();
  const emailService = new NoopEmailService();
  app.use("/api/auth", createAuthRoutes({
    register: new RegisterUseCase(userStore, sessions, hasher),
    login: new LoginUseCase(userStore, sessions, hasher, new NoopAuditLogger()),
    logout: new LogoutUseCase(sessions),
    getCurrentUser,
    updateProfile: new UpdateProfileUseCase(userStore),
    changePassword: new ChangePasswordUseCase(userStore, hasher),
    acceptInvite: new AcceptInviteUseCase(userStore, sessions, invitations, hasher),
    forgotPassword: new ForgotPasswordUseCase(userStore, passwordResets, emailService),
    resetPassword: new ResetPasswordUseCase(userStore, sessions, passwordResets, hasher),
    deleteAccount: new DeleteAccountUseCase(userStore, hasher, new NoopAuditLogger(), workspaces),
    googleAuth: new GoogleAuthUseCase(userStore, sessions, new InMemoryOAuthTokenRepository()),
    githubAuth: new GitHubAuthUseCase(userStore, sessions, new InMemoryOAuthTokenRepository()),
    unlinkOAuth: new UnlinkOAuthUseCase(userStore, new InMemoryOAuthTokenRepository()),
  }, requireAuth));

  app.use("/api/diagrams/:diagramId/comments", createCommentRoutes({
    list: new ListCommentsUseCase(comments, diagrams),
    create: new CreateCommentUseCase(comments, diagrams),
    reply: new ReplyCommentUseCase(comments, diagrams),
    resolve: new ResolveCommentUseCase(comments, diagrams),
    delete: new DeleteCommentUseCase(comments, diagrams),
    toggleLike: new ToggleLikeUseCase(comments, diagrams),
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
  // createApp() reinitializes per test
});

test("POST /api/diagrams/:diagramId/comments creates a thread (owner)", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cowner@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie)
    .send({ elementId: "el-1", body: "First thread" });

  assert.equal(res.status, 201);
  assert.ok(res.body.thread.id);
  assert.equal(res.body.thread.diagramId, diagram.id);
  assert.equal(res.body.thread.elementId, "el-1");
  assert.equal(res.body.thread.body, "First thread");
  assert.equal(res.body.thread.authorId, userId);
  assert.equal(res.body.thread.authorName, "cowner");
  assert.equal(res.body.thread.resolved, false);
  assert.equal(res.body.thread.resolvedBy, null);
  assert.equal(res.body.thread.resolvedAt, null);
  assert.equal(res.body.thread.sceneId, null);
  assert.deepEqual(res.body.thread.replies, []);
  assert.equal(res.body.thread.likeCount, 0);
  assert.equal(res.body.thread.likedByMe, false);
  assert.ok(res.body.thread.createdAt);
  assert.ok(res.body.thread.updatedAt);
});

test("POST /api/diagrams/:diagramId/comments returns 404 when diagram does not exist", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "cnotfound@example.com");

  const res = await request(app)
    .post(`/api/diagrams/00000000-0000-0000-0000-000000000000/comments`)
    .set("Cookie", cookie)
    .send({ elementId: "el-1", body: "Body" });

  assert.equal(res.status, 404);
});

test("POST /api/diagrams/:diagramId/comments returns 401 without auth", async () => {
  const app = createApp();
  const { userId } = await registerAndGetUser(app, "cnoauth@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .send({ elementId: "el-1", body: "Body" });

  assert.equal(res.status, 401);
});

test("POST /api/diagrams/:diagramId/comments rejects empty body with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cvalid@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie)
    .send({ elementId: "el-1", body: "" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid request body");
});

test("POST /api/diagrams/:diagramId/comments rejects missing elementId with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cvalid2@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie)
    .send({ body: "missing element" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid request body");
});

test("POST /api/diagrams/:diagramId/comments returns 404 when user has no access", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "cintruder@example.com");
  const diagram = await diagrams.create({ ownerId: "other-user-id", title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie)
    .send({ elementId: "el-1", body: "Sneaky" });

  // requireAccess returns 404 for null role (deniability by 404)
  assert.equal(res.status, 404);
});

test("POST /api/diagrams/:diagramId/comments allows viewers to create", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cviewer@example.com");
  const diagram = await diagrams.create({ ownerId: "other-user-id", title: "D" });
  diagrams.members.push({ diagramId: diagram.id, userId, role: "viewer" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie)
    .send({ elementId: "el-1", body: "viewer comment" });

  assert.equal(res.status, 201);
  assert.equal(res.body.thread.authorId, userId);
});

test("GET /api/diagrams/:diagramId/comments lists threads with replies and like info", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "clist@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const created = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "Thread A",
  });
  await comments.addReply({ threadId: created.id, authorId: userId, body: "Reply 1" });
  await comments.toggleLike(created.id, userId);

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.threads.length, 1);
  const thread = res.body.threads[0];
  assert.equal(thread.id, created.id);
  assert.equal(thread.body, "Thread A");
  assert.equal(thread.replies.length, 1);
  assert.equal(thread.replies[0].body, "Reply 1");
  assert.equal(thread.replies[0].authorName, "clist");
  assert.equal(thread.likeCount, 1);
  assert.equal(thread.likedByMe, true);
});

test("GET /api/diagrams/:diagramId/comments filters by sceneId", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cscene@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const sceneId = "11111111-1111-1111-1111-111111111111";
  const otherScene = "22222222-2222-2222-2222-222222222222";
  await comments.createThread({ diagramId: diagram.id, sceneId, elementId: "e1", authorId: userId, body: "scene A" });
  await comments.createThread({ diagramId: diagram.id, sceneId: otherScene, elementId: "e2", authorId: userId, body: "scene B" });
  await comments.createThread({ diagramId: diagram.id, sceneId: null, elementId: "e3", authorId: userId, body: "global" });

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/comments?sceneId=${sceneId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  // Should include matching scene + nulls (global), exclude the other scene
  assert.equal(res.body.threads.length, 2);
  const bodies = res.body.threads.map((t: { body: string }) => t.body).sort();
  assert.deepEqual(bodies, ["global", "scene A"]);
});

test("GET /api/diagrams/:diagramId/comments returns 404 when user lacks access", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "clistforbid@example.com");
  const diagram = await diagrams.create({ ownerId: "other-user-id", title: "D" });

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("POST /api/diagrams/:diagramId/comments/:threadId/replies adds a reply", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "creply@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "root",
  });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments/${thread.id}/replies`)
    .set("Cookie", cookie)
    .send({ body: "thanks!" });

  assert.equal(res.status, 201);
  assert.ok(res.body.reply.id);
  assert.equal(res.body.reply.threadId, thread.id);
  assert.equal(res.body.reply.authorId, userId);
  assert.equal(res.body.reply.authorName, "creply");
  assert.equal(res.body.reply.body, "thanks!");
  assert.ok(res.body.reply.createdAt);
});

test("POST /api/diagrams/:diagramId/comments/:threadId/replies returns 404 when thread missing", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "creply404@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments/00000000-0000-0000-0000-000000000000/replies`)
    .set("Cookie", cookie)
    .send({ body: "ghost" });

  assert.equal(res.status, 404);
});

test("POST /api/diagrams/:diagramId/comments/:threadId/replies rejects empty body with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "creply400@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "root",
  });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments/${thread.id}/replies`)
    .set("Cookie", cookie)
    .send({ body: "   " });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid request body");
});

test("PATCH /:threadId/resolve marks a thread resolved (editor)", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cresolve@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "needs fixing",
  });

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/comments/${thread.id}/resolve`)
    .set("Cookie", cookie)
    .send({ resolved: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.thread.id, thread.id);
  assert.equal(res.body.thread.resolved, true);
  assert.equal(res.body.thread.resolvedBy, userId);
  assert.ok(res.body.thread.resolvedAt);
});

test("PATCH /:threadId/resolve can unresolve", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cunresolve@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "x",
  });
  await comments.resolveThread(thread.id, userId);

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/comments/${thread.id}/resolve`)
    .set("Cookie", cookie)
    .send({ resolved: false });

  assert.equal(res.status, 200);
  assert.equal(res.body.thread.resolved, false);
  assert.equal(res.body.thread.resolvedBy, null);
  assert.equal(res.body.thread.resolvedAt, null);
});

test("PATCH /:threadId/resolve returns 403 for viewer", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cresolveviewer@example.com");
  const diagram = await diagrams.create({ ownerId: "other-user-id", title: "D" });
  diagrams.members.push({ diagramId: diagram.id, userId, role: "viewer" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: "other-user-id",
    body: "owners",
  });

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/comments/${thread.id}/resolve`)
    .set("Cookie", cookie)
    .send({ resolved: true });

  assert.equal(res.status, 403);
});

test("PATCH /:threadId/resolve rejects non-boolean payload with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cresolve400@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "x",
  });

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/comments/${thread.id}/resolve`)
    .set("Cookie", cookie)
    .send({ resolved: "yes" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid request body");
});

test("DELETE /:threadId removes a thread (author)", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cdel@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "delete me",
  });

  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/comments/${thread.id}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(comments.threads.length, 0);
});

test("DELETE /:threadId returns 403 when non-author editor tries to delete", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "cdelowner@example.com");
  const { cookie: editorCookie, userId: editorId } = await registerAndGetUser(app, "cdeleditor@example.com");

  const diagram = await diagrams.create({ ownerId: ownerId, title: "D" });
  diagrams.members.push({ diagramId: diagram.id, userId: editorId, role: "editor" });

  // Owner creates the thread
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", ownerCookie)
    .send({ elementId: "el-1", body: "owners thread" });
  const threadId = createRes.body.thread.id as string;

  // Editor (not author, not owner) cannot delete
  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/comments/${threadId}`)
    .set("Cookie", editorCookie);

  assert.equal(res.status, 403);
  assert.equal(comments.threads.length, 1);
});

test("DELETE /:threadId allows diagram owner to delete a thread they did not author", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "cdelowner2@example.com");
  const { cookie: editorCookie, userId: editorId } = await registerAndGetUser(app, "cdeleditor2@example.com");

  const diagram = await diagrams.create({ ownerId: ownerId, title: "D" });
  diagrams.members.push({ diagramId: diagram.id, userId: editorId, role: "editor" });

  // Editor creates a thread
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments`)
    .set("Cookie", editorCookie)
    .send({ elementId: "el-1", body: "editors thread" });
  const threadId = createRes.body.thread.id as string;

  // Owner can delete it
  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/comments/${threadId}`)
    .set("Cookie", ownerCookie);

  assert.equal(res.status, 200);
  assert.equal(comments.threads.length, 0);
});

test("DELETE /:threadId returns 404 when thread is missing", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "cdel404@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/comments/00000000-0000-0000-0000-000000000000`)
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("POST /:threadId/like toggles a like on and off", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "clike@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });
  const thread = await comments.createThread({
    diagramId: diagram.id,
    sceneId: null,
    elementId: "el-1",
    authorId: userId,
    body: "x",
  });

  const on = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments/${thread.id}/like`)
    .set("Cookie", cookie);

  assert.equal(on.status, 200);
  assert.equal(on.body.liked, true);
  assert.equal(on.body.likeCount, 1);

  const off = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments/${thread.id}/like`)
    .set("Cookie", cookie);

  assert.equal(off.status, 200);
  assert.equal(off.body.liked, false);
  assert.equal(off.body.likeCount, 0);
});

test("POST /:threadId/like returns 404 when thread is missing", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "clike404@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/comments/00000000-0000-0000-0000-000000000000/like`)
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("GET /api/diagrams/:diagramId/comments without auth returns 401", async () => {
  const app = createApp();
  const { userId } = await registerAndGetUser(app, "cnoauth2@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "D" });

  const res = await request(app).get(`/api/diagrams/${diagram.id}/comments`);
  assert.equal(res.status, 401);
});

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
import { CreateFolderUseCase } from "../../application/use-cases/folders/create-folder";
import { ListFoldersUseCase } from "../../application/use-cases/folders/list-folders";
import { RenameFolderUseCase } from "../../application/use-cases/folders/rename-folder";
import { DeleteFolderUseCase } from "../../application/use-cases/folders/delete-folder";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createFolderRoutes } from "../../infrastructure/http/routes/folder.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryFolderRepository } from "../fakes/in-memory-folder-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";

let folders: InMemoryFolderRepository;
let workspaces: InMemoryWorkspaceRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  folders = new InMemoryFolderRepository();
  workspaces = new InMemoryWorkspaceRepository();
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

  app.use("/api/folders", createFolderRoutes({
    create: new CreateFolderUseCase(folders, workspaces),
    list: new ListFoldersUseCase(folders, workspaces),
    rename: new RenameFolderUseCase(folders),
    delete: new DeleteFolderUseCase(folders),
  }, requireAuth));

  return app;
}

async function registerAndGetCookie(app: express.Express, email: string) {
  const res = await request(app).post("/api/auth/register").send({
    email,
    name: email.split("@")[0],
    password: "password123",
  });
  return res.headers["set-cookie"][0].split(";")[0];
}

beforeEach(() => {
  folders = new InMemoryFolderRepository();
  workspaces = new InMemoryWorkspaceRepository();
});

test("POST /api/folders creates a folder", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "fcreate@example.com");

  const res = await request(app)
    .post("/api/folders")
    .set("Cookie", cookie)
    .send({ name: "Sketches" });

  assert.equal(res.status, 201);
  assert.equal(res.body.folder.name, "Sketches");
  assert.equal(res.body.folder.workspaceId, null);
  assert.ok(res.body.folder.id);
});

test("GET /api/folders lists user folders", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "flist@example.com");

  await request(app).post("/api/folders").set("Cookie", cookie).send({ name: "A" });
  await request(app).post("/api/folders").set("Cookie", cookie).send({ name: "B" });

  const res = await request(app).get("/api/folders").set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.folders.length, 2);
  const names = res.body.folders.map((f: { name: string }) => f.name).sort();
  assert.deepEqual(names, ["A", "B"]);
});

test("PATCH /api/folders/:id renames a folder owned by the user", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "frename@example.com");

  const createRes = await request(app)
    .post("/api/folders")
    .set("Cookie", cookie)
    .send({ name: "Old" });
  const folderId = createRes.body.folder.id as string;

  const res = await request(app)
    .patch(`/api/folders/${folderId}`)
    .set("Cookie", cookie)
    .send({ name: "New" });

  assert.equal(res.status, 200);
  assert.equal(res.body.folder.name, "New");
});

test("PATCH /api/folders/:id returns 404 for unknown folder", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "f404@example.com");

  const res = await request(app)
    .patch("/api/folders/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie)
    .send({ name: "X" });

  assert.equal(res.status, 404);
});

test("PATCH /api/folders/:id returns 403 when not owner", async () => {
  const app = createApp();
  const ownerCookie = await registerAndGetCookie(app, "fowner@example.com");
  const intruderCookie = await registerAndGetCookie(app, "fintruder@example.com");

  const createRes = await request(app)
    .post("/api/folders")
    .set("Cookie", ownerCookie)
    .send({ name: "Mine" });
  const folderId = createRes.body.folder.id as string;

  const res = await request(app)
    .patch(`/api/folders/${folderId}`)
    .set("Cookie", intruderCookie)
    .send({ name: "Hacked" });

  assert.equal(res.status, 403);
});

test("DELETE /api/folders/:id deletes folder owned by user", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "fdel@example.com");

  const createRes = await request(app)
    .post("/api/folders")
    .set("Cookie", cookie)
    .send({ name: "Trash" });
  const folderId = createRes.body.folder.id as string;

  const res = await request(app).delete(`/api/folders/${folderId}`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const list = await request(app).get("/api/folders").set("Cookie", cookie);
  assert.equal(list.body.folders.length, 0);
});

test("DELETE /api/folders/:id returns 403 when not owner", async () => {
  const app = createApp();
  const ownerCookie = await registerAndGetCookie(app, "fdelo@example.com");
  const intruderCookie = await registerAndGetCookie(app, "fdeli@example.com");

  const createRes = await request(app)
    .post("/api/folders")
    .set("Cookie", ownerCookie)
    .send({ name: "Keep" });
  const folderId = createRes.body.folder.id as string;

  const res = await request(app).delete(`/api/folders/${folderId}`).set("Cookie", intruderCookie);
  assert.equal(res.status, 403);
});

test("POST /api/folders rejects empty name with 400", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "fempty@example.com");

  const res = await request(app)
    .post("/api/folders")
    .set("Cookie", cookie)
    .send({ name: "" });

  assert.equal(res.status, 400);
});

test("POST /api/folders rejects non-uuid workspaceId with 400", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "fbadws@example.com");

  const res = await request(app)
    .post("/api/folders")
    .set("Cookie", cookie)
    .send({ name: "X", workspaceId: "not-a-uuid" });

  assert.equal(res.status, 400);
});

test("POST /api/folders returns 403 when user is not member of workspace", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "fwsforbid@example.com");

  const ws = await workspaces.create({ name: "Other", ownerId: "other-user-id" });

  const res = await request(app)
    .post("/api/folders")
    .set("Cookie", cookie)
    .send({ name: "X", workspaceId: ws.id });

  assert.equal(res.status, 403);
});

test("GET /api/folders without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/folders");
  assert.equal(res.status, 401);
});

test("POST /api/folders without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).post("/api/folders").send({ name: "X" });
  assert.equal(res.status, 401);
});

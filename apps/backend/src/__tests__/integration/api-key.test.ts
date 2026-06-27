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
import { CreateApiKeyUseCase } from "../../application/use-cases/api-keys/create-api-key";
import { ListApiKeysUseCase } from "../../application/use-cases/api-keys/list-api-keys";
import { RevokeApiKeyUseCase } from "../../application/use-cases/api-keys/revoke-api-key";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createApiKeyRoutes } from "../../infrastructure/http/routes/api-key.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryApiKeyRepository } from "../fakes/in-memory-api-key-repository";
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

let apiKeys: InMemoryApiKeyRepository;
let workspaces: InMemoryWorkspaceRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  apiKeys = new InMemoryApiKeyRepository();
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

  app.use("/api/api-keys", createApiKeyRoutes({
    create: new CreateApiKeyUseCase(apiKeys, workspaces),
    list: new ListApiKeysUseCase(apiKeys),
    revoke: new RevokeApiKeyUseCase(apiKeys),
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

async function setupWorkspaceForUser(userId: string, name = "WS") {
  return workspaces.create({ name, ownerId: userId });
}

beforeEach(() => {
  apiKeys = new InMemoryApiKeyRepository();
  workspaces = new InMemoryWorkspaceRepository();
});

test("POST /api/api-keys creates a key and returns plainKey once", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "ak1@example.com");
  const ws = await setupWorkspaceForUser(userId);

  const res = await request(app)
    .post("/api/api-keys")
    .set("Cookie", cookie)
    .send({ name: "CI key", workspaceId: ws.id });

  assert.equal(res.status, 201);
  assert.equal(res.body.key.name, "CI key");
  assert.equal(res.body.key.workspaceId, ws.id);
  assert.ok(res.body.key.id);
  assert.ok(res.body.key.keyPrefix.startsWith("dhk_"));
  assert.ok(res.body.plainKey.startsWith("dhk_"));
});

test("POST /api/api-keys returns 403 when user is not a workspace member", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "ak2@example.com");
  const otherWs = await workspaces.create({ name: "Other", ownerId: "other-user-id" });

  const res = await request(app)
    .post("/api/api-keys")
    .set("Cookie", cookie)
    .send({ name: "K", workspaceId: otherWs.id });

  assert.equal(res.status, 403);
});

test("POST /api/api-keys rejects missing workspaceId with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "ak3@example.com");

  const res = await request(app)
    .post("/api/api-keys")
    .set("Cookie", cookie)
    .send({ name: "K" });

  assert.equal(res.status, 400);
});

test("POST /api/api-keys rejects non-uuid workspaceId with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "ak4@example.com");

  const res = await request(app)
    .post("/api/api-keys")
    .set("Cookie", cookie)
    .send({ name: "K", workspaceId: "not-a-uuid" });

  assert.equal(res.status, 400);
});

test("GET /api/api-keys lists user's keys with no plain key leaked", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "ak5@example.com");
  const ws = await setupWorkspaceForUser(userId);

  await request(app).post("/api/api-keys").set("Cookie", cookie).send({ name: "A", workspaceId: ws.id });
  await request(app).post("/api/api-keys").set("Cookie", cookie).send({ name: "B", workspaceId: ws.id });

  const res = await request(app).get("/api/api-keys").set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.keys.length, 2);
  for (const key of res.body.keys) {
    assert.ok(!("keyHash" in key), "keyHash must not leak");
    assert.ok(!("plainKey" in key), "plainKey must not leak");
    assert.ok(key.keyPrefix.startsWith("dhk_"));
  }
});

test("GET /api/api-keys isolates keys by user", async () => {
  const app = createApp();
  const { cookie: aliceCookie, userId: aliceId } = await registerAndGetUser(app, "akalice@example.com");
  const { cookie: bobCookie } = await registerAndGetUser(app, "akbob@example.com");

  const aliceWs = await setupWorkspaceForUser(aliceId);
  await request(app).post("/api/api-keys").set("Cookie", aliceCookie).send({ name: "Alice", workspaceId: aliceWs.id });

  const aliceList = await request(app).get("/api/api-keys").set("Cookie", aliceCookie);
  const bobList = await request(app).get("/api/api-keys").set("Cookie", bobCookie);

  assert.equal(aliceList.body.keys.length, 1);
  assert.equal(bobList.body.keys.length, 0);
});

test("DELETE /api/api-keys/:id revokes a key owned by user", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "ak7@example.com");
  const ws = await setupWorkspaceForUser(userId);

  const create = await request(app)
    .post("/api/api-keys")
    .set("Cookie", cookie)
    .send({ name: "K", workspaceId: ws.id });
  const keyId = create.body.key.id as string;

  const res = await request(app).delete(`/api/api-keys/${keyId}`).set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const stored = apiKeys.store.find((k) => k.id === keyId);
  assert.ok(stored?.revokedAt instanceof Date);
});

test("DELETE /api/api-keys/:id returns 404 for unknown key", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "ak8@example.com");

  const res = await request(app)
    .delete("/api/api-keys/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("DELETE /api/api-keys/:id returns 403 when not owner of key", async () => {
  const app = createApp();
  const { cookie: aliceCookie, userId: aliceId } = await registerAndGetUser(app, "akao@example.com");
  const { cookie: bobCookie } = await registerAndGetUser(app, "akbo@example.com");

  const aliceWs = await setupWorkspaceForUser(aliceId);
  const create = await request(app)
    .post("/api/api-keys")
    .set("Cookie", aliceCookie)
    .send({ name: "Alices", workspaceId: aliceWs.id });
  const keyId = create.body.key.id as string;

  const res = await request(app).delete(`/api/api-keys/${keyId}`).set("Cookie", bobCookie);
  assert.equal(res.status, 403);
});

test("POST /api/api-keys returns 409 when at max active keys", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "akmax@example.com");
  const ws = await setupWorkspaceForUser(userId);

  for (let i = 0; i < 10; i++) {
    await request(app).post("/api/api-keys").set("Cookie", cookie).send({ name: `K${i}`, workspaceId: ws.id });
  }

  const res = await request(app)
    .post("/api/api-keys")
    .set("Cookie", cookie)
    .send({ name: "extra", workspaceId: ws.id });

  assert.equal(res.status, 409);
});

test("GET /api/api-keys without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/api-keys");
  assert.equal(res.status, 401);
});

test("POST /api/api-keys without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).post("/api/api-keys").send({ name: "X", workspaceId: "00000000-0000-0000-0000-000000000000" });
  assert.equal(res.status, 401);
});

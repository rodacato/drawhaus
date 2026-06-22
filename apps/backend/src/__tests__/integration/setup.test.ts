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
import { GetSiteSettingsUseCase } from "../../application/use-cases/admin/get-site-settings";
import { UpdateSiteSettingsUseCase } from "../../application/use-cases/admin/update-site-settings";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createSetupRoutes } from "../../infrastructure/http/routes/setup.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemorySiteSettingsRepository } from "../fakes/in-memory-site-settings-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";

let users: InMemoryUserRepository;
let settings: InMemorySiteSettingsRepository;
let setupCompleteCalls: number;

function createApp() {
  users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  settings = new InMemorySiteSettingsRepository();
  setupCompleteCalls = 0;
  const workspaces = new InMemoryWorkspaceRepository();
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

  app.use("/api/setup", createSetupRoutes(
    {
      getSettings: new GetSiteSettingsUseCase(settings),
      updateSettings: new UpdateSiteSettingsUseCase(settings),
    },
    users,
    requireAuth,
    () => { setupCompleteCalls += 1; },
  ));

  return app;
}

async function registerAdmin(app: express.Express, email = "admin@example.com") {
  const res = await request(app).post("/api/auth/register").send({
    email,
    name: "Admin",
    password: "password123",
  });
  // Manually promote since RegisterUseCase isn't wired with siteSettings here
  const adminUser = users.store.find((u) => u.email === email);
  if (adminUser) adminUser.role = "admin";
  return res.headers["set-cookie"][0].split(";")[0];
}

beforeEach(() => {
  users = new InMemoryUserRepository();
  settings = new InMemorySiteSettingsRepository();
  setupCompleteCalls = 0;
});

test("GET /api/setup/status returns step 1 when no users exist", async () => {
  const app = createApp();

  const res = await request(app).get("/api/setup/status");

  assert.equal(res.status, 200);
  assert.equal(res.body.step, 1);
  assert.equal(res.body.setupCompleted, false);
});

test("GET /api/setup/status returns step 2 after first user is registered", async () => {
  const app = createApp();
  await registerAdmin(app);

  const res = await request(app).get("/api/setup/status");

  assert.equal(res.status, 200);
  assert.equal(res.body.step, 2);
  assert.equal(res.body.setupCompleted, false);
});

test("GET /api/setup/status returns step 3 once instance name is customized", async () => {
  const app = createApp();
  await registerAdmin(app);
  await settings.update({ instanceName: "My Drawhaus" });

  const res = await request(app).get("/api/setup/status");

  assert.equal(res.body.step, 3);
});

test("GET /api/setup/status returns step 'complete' when setupCompleted", async () => {
  const app = createApp();
  await settings.update({ setupCompleted: true });

  const res = await request(app).get("/api/setup/status");

  assert.equal(res.status, 200);
  assert.equal(res.body.step, "complete");
  assert.equal(res.body.setupCompleted, true);
});

test("POST /api/setup/step-2 updates instance settings (admin only)", async () => {
  const app = createApp();
  const cookie = await registerAdmin(app);

  const res = await request(app)
    .post("/api/setup/step-2")
    .set("Cookie", cookie)
    .send({ instanceName: "Custom", registrationOpen: false });

  assert.equal(res.status, 200);
  assert.equal(res.body.settings.instanceName, "Custom");
  assert.equal(res.body.settings.registrationOpen, false);
});

test("POST /api/setup/step-2 returns 403 for non-admin", async () => {
  const app = createApp();
  // First register an admin so the next user is NOT first
  await registerAdmin(app, "admin@example.com");
  const regularRes = await request(app).post("/api/auth/register").send({
    email: "user@example.com",
    name: "User",
    password: "password123",
  });
  const regularCookie = regularRes.headers["set-cookie"][0].split(";")[0];

  const res = await request(app)
    .post("/api/setup/step-2")
    .set("Cookie", regularCookie)
    .send({ instanceName: "Custom", registrationOpen: false });

  assert.equal(res.status, 403);
});

test("POST /api/setup/step-2 returns 401 without auth", async () => {
  const app = createApp();

  const res = await request(app)
    .post("/api/setup/step-2")
    .send({ instanceName: "X", registrationOpen: true });

  assert.equal(res.status, 401);
});

test("POST /api/setup/step-2 rejects invalid body with 400", async () => {
  const app = createApp();
  const cookie = await registerAdmin(app);

  const res = await request(app)
    .post("/api/setup/step-2")
    .set("Cookie", cookie)
    .send({ instanceName: "X" });

  assert.equal(res.status, 400);
});

test("POST /api/setup/skip-integrations marks setupSkippedIntegrations", async () => {
  const app = createApp();
  const cookie = await registerAdmin(app);

  const res = await request(app)
    .post("/api/setup/skip-integrations")
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 200);
  assert.equal(res.body.settings.setupSkippedIntegrations, true);
});

test("POST /api/setup/complete sets setupCompleted and invokes invalidate", async () => {
  const app = createApp();
  const cookie = await registerAdmin(app);

  const res = await request(app)
    .post("/api/setup/complete")
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 200);
  assert.equal(res.body.settings.setupCompleted, true);
  assert.equal(setupCompleteCalls, 1);
});

test("POST /api/setup/complete returns 401 without auth", async () => {
  const app = createApp();
  const res = await request(app).post("/api/setup/complete").send({});
  assert.equal(res.status, 401);
  assert.equal(setupCompleteCalls, 0);
});

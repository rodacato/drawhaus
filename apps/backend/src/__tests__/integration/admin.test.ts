// Env setup runs at module-load via this side-effect import — must come first.
import "./_admin-env-setup";
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
import { ListUsersUseCase } from "../../application/use-cases/admin/list-users";
import { AdminUpdateUserUseCase } from "../../application/use-cases/admin/update-user";
import { AdminDeleteUserUseCase } from "../../application/use-cases/admin/delete-user";
import { GetSiteSettingsUseCase } from "../../application/use-cases/admin/get-site-settings";
import { UpdateSiteSettingsUseCase } from "../../application/use-cases/admin/update-site-settings";
import { InviteUserUseCase } from "../../application/use-cases/admin/invite-user";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createAdminRoutes } from "../../infrastructure/http/routes/admin.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { ConfigProvider } from "../../infrastructure/services/config-provider";
import { INTEGRATION_KEYS } from "../../domain/entities/integration-secret";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemorySiteSettingsRepository } from "../fakes/in-memory-site-settings-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { InMemoryIntegrationSecretsRepository } from "../fakes/in-memory-integration-secrets-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";
import { InMemoryDriveBackupRepository } from "../fakes/in-memory-drive-backup-repository";
import { FakeOAuthProvider } from "../fakes/fake-oauth-provider";

interface MetricsStub {
  totalUsers: number;
  totalDiagrams: number;
  activeSessions: number;
  diagramsByOrigin: Record<string, number>;
  apiRequests24h: number;
}

let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;
let settings: InMemorySiteSettingsRepository;
let invitations: InMemoryInvitationRepository;
let secrets: InMemoryIntegrationSecretsRepository;
let metricsPayload: MetricsStub;

function buildBaseApp(opts?: { withSecrets?: boolean }) {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
  settings = new InMemorySiteSettingsRepository();
  invitations = new InMemoryInvitationRepository();
  secrets = new InMemoryIntegrationSecretsRepository();
  metricsPayload = {
    totalUsers: 0,
    totalDiagrams: 0,
    activeSessions: 0,
    diagramsByOrigin: {},
    apiRequests24h: 0,
  };
  const workspaces = new InMemoryWorkspaceRepository();
  const hasher = new FakeHasher();
  const emailService = new NoopEmailService();
  const passwordResets = new InMemoryPasswordResetRepository();

  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());

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

  // Stub GetMetricsUseCase: the real one calls pool.query directly.
  // The route only depends on `.execute()`, so a duck-typed object is enough.
  const getMetrics = {
    async execute() { return metricsPayload; },
  } as unknown as import("../../application/use-cases/admin/get-metrics").GetMetricsUseCase;

  const adminDeps = {
    listUsers: new ListUsersUseCase(users),
    updateUser: new AdminUpdateUserUseCase(users, sessions, new NoopAuditLogger()),
    deleteUser: new AdminDeleteUserUseCase(users, sessions, new NoopAuditLogger()),
    getSettings: new GetSiteSettingsUseCase(settings),
    updateSettings: new UpdateSiteSettingsUseCase(settings),
    getMetrics,
    inviteUser: new InviteUserUseCase(users, invitations, settings, emailService),
  };

  const integrationSecrets = opts?.withSecrets
    ? { repo: secrets, configProvider: new ConfigProvider(secrets) }
    : undefined;

  app.use("/api/admin", createAdminRoutes(adminDeps, requireAuth, invitations, integrationSecrets));

  return app;
}

async function registerUser(app: express.Express, email: string) {
  const res = await request(app).post("/api/auth/register").send({
    email,
    name: email.split("@")[0],
    password: "password123",
  });
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { cookie, userId: res.body.user.id as string };
}

async function registerAdmin(app: express.Express, email: string) {
  const { cookie, userId } = await registerUser(app, email);
  const admin = users.store.find((u) => u.id === userId);
  if (admin) admin.role = "admin";
  return { cookie, userId };
}

beforeEach(() => {
  // Per-test isolation handled via buildBaseApp() in each test.
  // Reset INTEGRATION_KEYS env vars so /integrations env-fallback paths are deterministic.
  for (const key of INTEGRATION_KEYS) {
    delete process.env[key];
  }
});

// ---------------- GET /users ----------------

test("GET /api/admin/users returns all users for admin", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin1@example.com");
  await registerUser(app, "u1@example.com");
  await registerUser(app, "u2@example.com");

  const res = await request(app).get("/api/admin/users").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.users.length, 3);
  assert.ok(res.body.users[0].email);
  assert.equal(res.body.users[0].passwordHash, undefined, "passwordHash must be stripped");
});

test("GET /api/admin/users returns 401 without auth", async () => {
  const app = buildBaseApp();
  const res = await request(app).get("/api/admin/users");
  assert.equal(res.status, 401);
});

test("GET /api/admin/users returns 403 for non-admin", async () => {
  const app = buildBaseApp();
  // Register an admin first so the next user is NOT auto-promoted to admin
  // (RegisterUseCase makes the first user an admin).
  await registerAdmin(app, "seed-admin-users@example.com");
  const { cookie } = await registerUser(app, "u-plain@example.com");
  const res = await request(app).get("/api/admin/users").set("Cookie", cookie);
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Admin access required");
});

// ---------------- PATCH /users/:id ----------------

test("PATCH /api/admin/users/:id updates role", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-pu@example.com");
  const { userId } = await registerUser(app, "target1@example.com");

  const res = await request(app)
    .patch(`/api/admin/users/${userId}`)
    .set("Cookie", cookie)
    .send({ role: "admin" });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, "admin");
  assert.equal(res.body.user.passwordHash, undefined);
});

test("PATCH /api/admin/users/:id disables a user and revokes their sessions", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-pu2@example.com");
  const { userId } = await registerUser(app, "target2@example.com");
  const sessionCountBefore = sessions.sessions.filter((s) => s.userId === userId).length;
  assert.ok(sessionCountBefore > 0);

  const res = await request(app)
    .patch(`/api/admin/users/${userId}`)
    .set("Cookie", cookie)
    .send({ disabled: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.disabled, true);
  assert.equal(sessions.sessions.filter((s) => s.userId === userId).length, 0);
});

test("PATCH /api/admin/users/:id returns 400 with no fields", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-pu3@example.com");
  const { userId } = await registerUser(app, "target3@example.com");

  const res = await request(app)
    .patch(`/api/admin/users/${userId}`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 400);
});

test("PATCH /api/admin/users/:id rejects admin disabling self", async () => {
  const app = buildBaseApp();
  const { cookie, userId } = await registerAdmin(app, "admin-self@example.com");

  const res = await request(app)
    .patch(`/api/admin/users/${userId}`)
    .set("Cookie", cookie)
    .send({ disabled: true });

  assert.equal(res.status, 400);
});

test("PATCH /api/admin/users/:id returns 400 for non-uuid id", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-pu4@example.com");

  const res = await request(app)
    .patch("/api/admin/users/not-a-uuid")
    .set("Cookie", cookie)
    .send({ role: "user" });

  assert.equal(res.status, 400);
});

test("PATCH /api/admin/users/:id returns 403 for non-admin", async () => {
  const app = buildBaseApp();
  await registerAdmin(app, "seed-admin-pu@example.com");
  const { cookie } = await registerUser(app, "plain-pu@example.com");

  const res = await request(app)
    .patch("/api/admin/users/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie)
    .send({ role: "user" });

  assert.equal(res.status, 403);
});

// ---------------- DELETE /users/:id ----------------

test("DELETE /api/admin/users/:id deletes a non-admin user", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-del@example.com");
  const { userId } = await registerUser(app, "togo@example.com");

  const res = await request(app)
    .delete(`/api/admin/users/${userId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(users.store.find((u) => u.id === userId), undefined);
});

test("DELETE /api/admin/users/:id rejects deleting self", async () => {
  const app = buildBaseApp();
  const { cookie, userId } = await registerAdmin(app, "admin-self-del@example.com");

  const res = await request(app)
    .delete(`/api/admin/users/${userId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 400);
});

test("DELETE /api/admin/users/:id rejects deleting another admin", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-del2@example.com");
  const { userId } = await registerAdmin(app, "admin-other@example.com");

  const res = await request(app)
    .delete(`/api/admin/users/${userId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 400);
});

test("DELETE /api/admin/users/:id returns 404 for missing user", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-del404@example.com");

  const res = await request(app)
    .delete("/api/admin/users/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

// ---------------- GET /settings ----------------

test("GET /api/admin/settings returns current site settings", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-gs@example.com");

  const res = await request(app).get("/api/admin/settings").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.settings.instanceName, "Drawhaus");
  assert.equal(res.body.settings.registrationOpen, true);
});

// ---------------- PATCH /settings ----------------

test("PATCH /api/admin/settings updates non-backup fields without touching scheduler", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-ps1@example.com");

  const res = await request(app)
    .patch("/api/admin/settings")
    .set("Cookie", cookie)
    .send({ instanceName: "Renamed", maintenanceMode: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.settings.instanceName, "Renamed");
  assert.equal(res.body.settings.maintenanceMode, true);
  assert.equal(settings.current.instanceName, "Renamed");
});

test("PATCH /api/admin/settings restarts scheduler when backup config changes", async () => {
  // The route dynamically imports backup-scheduler and calls startBackupScheduler().
  // With BACKUP_ENABLED=false (set at top of file) the scheduler short-circuits
  // without starting a real cron task, so this only validates the call path runs cleanly.
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-ps2@example.com");

  const res = await request(app)
    .patch("/api/admin/settings")
    .set("Cookie", cookie)
    .send({ backupCron: "0 4 * * *", backupRetentionDays: 14 });

  assert.equal(res.status, 200);
  assert.equal(res.body.settings.backupCron, "0 4 * * *");
  assert.equal(res.body.settings.backupRetentionDays, 14);
});

test("PATCH /api/admin/settings returns 400 with empty body", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-ps3@example.com");

  const res = await request(app).patch("/api/admin/settings").set("Cookie", cookie).send({});

  assert.equal(res.status, 400);
});

test("PATCH /api/admin/settings returns 400 for invalid types", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-ps4@example.com");

  const res = await request(app)
    .patch("/api/admin/settings")
    .set("Cookie", cookie)
    .send({ maxWorkspacesPerUser: 9999 });

  assert.equal(res.status, 400);
});

// ---------------- GET /metrics ----------------

test("GET /api/admin/metrics returns the stub payload", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-met@example.com");
  metricsPayload = {
    totalUsers: 42,
    totalDiagrams: 100,
    activeSessions: 3,
    diagramsByOrigin: { ui: 80, api: 20 },
    apiRequests24h: 17,
  };

  const res = await request(app).get("/api/admin/metrics").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.metrics.totalUsers, 42);
  assert.equal(res.body.metrics.totalDiagrams, 100);
  assert.deepEqual(res.body.metrics.diagramsByOrigin, { ui: 80, api: 20 });
});

test("GET /api/admin/metrics returns 403 for non-admin", async () => {
  const app = buildBaseApp();
  await registerAdmin(app, "seed-admin-met@example.com");
  const { cookie } = await registerUser(app, "plain-met@example.com");

  const res = await request(app).get("/api/admin/metrics").set("Cookie", cookie);
  assert.equal(res.status, 403);
});

// ---------------- POST /invite ----------------

test("POST /api/admin/invite creates a pending invitation", async () => {
  const app = buildBaseApp();
  const { cookie, userId } = await registerAdmin(app, "admin-inv@example.com");

  const res = await request(app)
    .post("/api/admin/invite")
    .set("Cookie", cookie)
    .send({ email: "newcomer@example.com", role: "user" });

  assert.equal(res.status, 201);
  assert.equal(res.body.invitation.email, "newcomer@example.com");
  assert.equal(res.body.invitation.role, "user");
  assert.equal(res.body.invitation.invitedBy, userId);
  assert.equal(invitations.store.length, 1);
});

test("POST /api/admin/invite defaults role to user when omitted", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-inv2@example.com");

  const res = await request(app)
    .post("/api/admin/invite")
    .set("Cookie", cookie)
    .send({ email: "default-role@example.com" });

  assert.equal(res.status, 201);
  assert.equal(res.body.invitation.role, "user");
});

test("POST /api/admin/invite returns 400 for invalid email", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-inv3@example.com");

  const res = await request(app)
    .post("/api/admin/invite")
    .set("Cookie", cookie)
    .send({ email: "not-an-email" });

  assert.equal(res.status, 400);
});

test("POST /api/admin/invite returns 409 when email already belongs to a user", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-inv4@example.com");
  await registerUser(app, "taken@example.com");

  const res = await request(app)
    .post("/api/admin/invite")
    .set("Cookie", cookie)
    .send({ email: "taken@example.com" });

  assert.equal(res.status, 409);
});

// ---------------- GET /invitations ----------------

test("GET /api/admin/invitations lists pending invitations only", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-li@example.com");
  await request(app).post("/api/admin/invite").set("Cookie", cookie).send({ email: "p1@example.com" });
  await request(app).post("/api/admin/invite").set("Cookie", cookie).send({ email: "p2@example.com" });
  // Mark one as used
  invitations.store[0].usedAt = new Date();

  const res = await request(app).get("/api/admin/invitations").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.invitations.length, 1);
  assert.equal(res.body.invitations[0].email, "p2@example.com");
});

// ---------------- GET /integrations ----------------

test("GET /api/admin/integrations (no secrets repo) reports env-sourced + none", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-int1@example.com");
  process.env.GOOGLE_CLIENT_ID = "google-id-abcdefg-tail1234";

  const res = await request(app).get("/api/admin/integrations").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.encryptionEnabled, false);
  assert.equal(res.body.integrations.length, INTEGRATION_KEYS.length);
  const google = res.body.integrations.find((i: { key: string }) => i.key === "GOOGLE_CLIENT_ID");
  assert.equal(google.source, "env");
  assert.match(google.maskedValue as string, /^goog.+1234$/);
  const ghClient = res.body.integrations.find((i: { key: string }) => i.key === "GH_CLIENT_ID");
  assert.equal(ghClient.source, "none");
  assert.equal(ghClient.maskedValue, "");
});

test("GET /api/admin/integrations (with secrets repo) mixes db + env sources", async () => {
  const app = buildBaseApp({ withSecrets: true });
  const { cookie } = await registerAdmin(app, "admin-int2@example.com");
  await secrets.set("GOOGLE_CLIENT_SECRET", "db-secret-supersecret-1234");
  process.env.RESEND_API_KEY = "resend-env-aaaaaa-bbbb";

  const res = await request(app).get("/api/admin/integrations").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.encryptionEnabled, true);
  const dbBacked = res.body.integrations.find((i: { key: string }) => i.key === "GOOGLE_CLIENT_SECRET");
  assert.equal(dbBacked.source, "db");
  assert.match(dbBacked.maskedValue as string, /^db-s.+1234$/);
  const envBacked = res.body.integrations.find((i: { key: string }) => i.key === "RESEND_API_KEY");
  assert.equal(envBacked.source, "env");
  assert.match(envBacked.maskedValue as string, /^rese.+bbbb$/);
});

test("GET /api/admin/integrations masks short values without slicing", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-int3@example.com");
  process.env.FROM_EMAIL = "short";

  const res = await request(app).get("/api/admin/integrations").set("Cookie", cookie);

  const fromEmail = res.body.integrations.find((i: { key: string }) => i.key === "FROM_EMAIL");
  assert.equal(fromEmail.source, "env");
  // 5 chars <= 8 => fully masked with bullets
  assert.equal(fromEmail.maskedValue, "•••••");
});

// ---------------- PATCH /integrations ----------------

test("PATCH /api/admin/integrations returns 400 when secrets repo is undefined", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-pi1@example.com");

  const res = await request(app)
    .patch("/api/admin/integrations")
    .set("Cookie", cookie)
    .send({ key: "GOOGLE_CLIENT_ID", value: "new-value" });

  assert.equal(res.status, 400);
  assert.match(res.body.error as string, /ENCRYPTION_KEY not configured/);
});

test("PATCH /api/admin/integrations stores a new secret value", async () => {
  const app = buildBaseApp({ withSecrets: true });
  const { cookie } = await registerAdmin(app, "admin-pi2@example.com");

  const res = await request(app)
    .patch("/api/admin/integrations")
    .set("Cookie", cookie)
    .send({ key: "GH_CLIENT_SECRET", value: "stored-secret-1" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(await secrets.get("GH_CLIENT_SECRET"), "stored-secret-1");
});

test("PATCH /api/admin/integrations with empty value deletes the secret", async () => {
  const app = buildBaseApp({ withSecrets: true });
  const { cookie } = await registerAdmin(app, "admin-pi3@example.com");
  await secrets.set("GH_CLIENT_SECRET", "will-be-deleted");

  const res = await request(app)
    .patch("/api/admin/integrations")
    .set("Cookie", cookie)
    .send({ key: "GH_CLIENT_SECRET", value: "" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(await secrets.get("GH_CLIENT_SECRET"), null);
});

test("PATCH /api/admin/integrations returns 400 for unknown key", async () => {
  const app = buildBaseApp({ withSecrets: true });
  const { cookie } = await registerAdmin(app, "admin-pi4@example.com");

  const res = await request(app)
    .patch("/api/admin/integrations")
    .set("Cookie", cookie)
    .send({ key: "DEFINITELY_NOT_A_KEY", value: "x" });

  assert.equal(res.status, 400);
});

// ---------------- GET /backups ----------------

test("GET /api/admin/backups returns empty list and env-sourced config", async () => {
  const app = buildBaseApp();
  const { cookie } = await registerAdmin(app, "admin-bk@example.com");

  const res = await request(app).get("/api/admin/backups").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.backups, []);
  // With BACKUP_ENABLED=false and no DB, getBackupConfig falls back to env vars.
  assert.equal(res.body.config.enabled, false);
  assert.equal(typeof res.body.config.schedule, "string");
  assert.equal(typeof res.body.config.retentionDays, "number");
});

test("GET /api/admin/backups returns 403 for non-admin", async () => {
  const app = buildBaseApp();
  await registerAdmin(app, "seed-admin-bk@example.com");
  const { cookie } = await registerUser(app, "plain-bk@example.com");

  const res = await request(app).get("/api/admin/backups").set("Cookie", cookie);
  assert.equal(res.status, 403);
});

// ---------------- POST /backups/trigger ----------------

test("POST /api/admin/backups/trigger requires admin", async () => {
  const app = buildBaseApp();
  await registerAdmin(app, "seed-admin-bkt@example.com");
  const { cookie } = await registerUser(app, "plain-bkt@example.com");

  const res = await request(app)
    .post("/api/admin/backups/trigger")
    .set("Cookie", cookie);

  assert.equal(res.status, 403);
});

test("POST /api/admin/backups/trigger returns 401 without auth", async () => {
  const app = buildBaseApp();
  const res = await request(app).post("/api/admin/backups/trigger");
  assert.equal(res.status, 401);
});

// NOTE: the happy path of POST /backups/trigger spawns pg_dump against
// the configured Postgres. We don't exercise that here — see PR notes.

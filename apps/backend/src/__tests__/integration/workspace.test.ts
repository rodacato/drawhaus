import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
import { CreateWorkspaceUseCase } from "../../application/use-cases/workspaces/create-workspace";
import { ListWorkspacesUseCase } from "../../application/use-cases/workspaces/list-workspaces";
import { GetWorkspaceUseCase } from "../../application/use-cases/workspaces/get-workspace";
import { UpdateWorkspaceUseCase } from "../../application/use-cases/workspaces/update-workspace";
import { DeleteWorkspaceUseCase } from "../../application/use-cases/workspaces/delete-workspace";
import {
  AddWorkspaceMemberUseCase,
  UpdateWorkspaceMemberRoleUseCase,
  RemoveWorkspaceMemberUseCase,
} from "../../application/use-cases/workspaces/manage-members";
import { InviteToWorkspaceUseCase } from "../../application/use-cases/workspaces/invite-to-workspace";
import { AcceptWorkspaceInviteUseCase } from "../../application/use-cases/workspaces/accept-workspace-invite";
import { EnsurePersonalWorkspaceUseCase } from "../../application/use-cases/workspaces/ensure-personal-workspace";
import { TransferWorkspaceOwnershipUseCase } from "../../application/use-cases/workspaces/transfer-ownership";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createWorkspaceRoutes } from "../../infrastructure/http/routes/workspace.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryTemplateRepository } from "../fakes/in-memory-template-repository";
import { InMemorySiteSettingsRepository } from "../fakes/in-memory-site-settings-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";
import { pool } from "../../infrastructure/db";

type PgRow = Record<string, unknown>;
type PgResult = { rows: PgRow[] };
type QueryHandler = (sql: string, params?: unknown[]) => PgResult | Promise<PgResult>;

let workspaces: InMemoryWorkspaceRepository;
let diagrams: InMemoryDiagramRepository;
let templates: InMemoryTemplateRepository;
let siteSettings: InMemorySiteSettingsRepository;
let originalQuery: typeof pool.query;
let queryHandler: QueryHandler;

function setQueryHandler(handler: QueryHandler) {
  queryHandler = handler;
}

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  workspaces = new InMemoryWorkspaceRepository();
  diagrams = new InMemoryDiagramRepository();
  templates = new InMemoryTemplateRepository();
  siteSettings = new InMemorySiteSettingsRepository();
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

  app.use("/api/workspaces", createWorkspaceRoutes({
    create: new CreateWorkspaceUseCase(workspaces, siteSettings),
    list: new ListWorkspacesUseCase(workspaces),
    get: new GetWorkspaceUseCase(workspaces),
    update: new UpdateWorkspaceUseCase(workspaces),
    delete: new DeleteWorkspaceUseCase(workspaces),
    addMember: new AddWorkspaceMemberUseCase(workspaces, siteSettings, new NoopAuditLogger()),
    updateMemberRole: new UpdateWorkspaceMemberRoleUseCase(workspaces),
    removeMember: new RemoveWorkspaceMemberUseCase(workspaces),
    invite: new InviteToWorkspaceUseCase(workspaces, siteSettings, emailService),
    acceptInvite: new AcceptWorkspaceInviteUseCase(workspaces),
    ensurePersonal: new EnsurePersonalWorkspaceUseCase(workspaces),
    transferOwnership: new TransferWorkspaceOwnershipUseCase(workspaces, diagrams, templates, new NoopAuditLogger()),
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
  // Default: any query that runs without a per-test override returns empty.
  // Tests that exercise the raw-SQL endpoints (or use cases that hit pool) install
  // a specific handler via setQueryHandler() inside the test body.
  originalQuery = pool.query.bind(pool);
  queryHandler = () => ({ rows: [] });
  // The pg Pool.query signature is overloaded; the stub accepts the (text, params) form
  // used by every caller in this surface.
  (pool as unknown as { query: QueryHandler }).query = (sql: string, params?: unknown[]) =>
    Promise.resolve(queryHandler(sql, params));
});

afterEach(() => {
  (pool as unknown as { query: typeof originalQuery }).query = originalQuery;
});

// ---------- POST /api/workspaces ----------

test("POST /api/workspaces creates a non-personal workspace", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wcreate@example.com");

  const res = await request(app)
    .post("/api/workspaces")
    .set("Cookie", cookie)
    .send({ name: "Acme", description: "Team space", color: "#ff0000", icon: "rocket" });

  assert.equal(res.status, 201);
  assert.ok(res.body.workspace.id);
  assert.equal(res.body.workspace.name, "Acme");
  assert.equal(res.body.workspace.description, "Team space");
  assert.equal(res.body.workspace.ownerId, userId);
  assert.equal(res.body.workspace.isPersonal, false);
  assert.equal(res.body.workspace.color, "#ff0000");
  assert.equal(res.body.workspace.icon, "rocket");
});

test("POST /api/workspaces returns 401 without auth", async () => {
  const app = createApp();
  const res = await request(app).post("/api/workspaces").send({ name: "Nope" });
  assert.equal(res.status, 401);
});

test("POST /api/workspaces returns 400 on empty name", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wcreate400@example.com");

  const res = await request(app)
    .post("/api/workspaces")
    .set("Cookie", cookie)
    .send({ name: "   " });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid request body");
});

test("POST /api/workspaces returns 403 when the user already hit the per-user limit", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wcap@example.com");
  siteSettings.current.maxWorkspacesPerUser = 1;
  await workspaces.create({ name: "First", ownerId: userId });

  const res = await request(app)
    .post("/api/workspaces")
    .set("Cookie", cookie)
    .send({ name: "Second" });

  assert.equal(res.status, 403);
});

// ---------- GET /api/workspaces ----------

test("GET /api/workspaces lists workspaces and auto-creates the personal one", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wlist@example.com");
  await workspaces.create({ name: "Team", ownerId: userId });

  const res = await request(app).get("/api/workspaces").set("Cookie", cookie);

  assert.equal(res.status, 200);
  // ensurePersonal must have created a personal workspace + the team one we seeded
  assert.equal(res.body.workspaces.length, 2);
  const personal = res.body.workspaces.find((w: { isPersonal: boolean }) => w.isPersonal);
  assert.ok(personal, "personal workspace should be created on first list");
  assert.equal(personal.ownerId, userId);
});

test("GET /api/workspaces returns 401 without auth", async () => {
  const app = createApp();
  const res = await request(app).get("/api/workspaces");
  assert.equal(res.status, 401);
});

test("GET /api/workspaces is idempotent for the personal workspace (no duplicate on re-list)", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wlistidem@example.com");

  await request(app).get("/api/workspaces").set("Cookie", cookie);
  const second = await request(app).get("/api/workspaces").set("Cookie", cookie);

  assert.equal(second.status, 200);
  const personalCount = second.body.workspaces.filter((w: { isPersonal: boolean }) => w.isPersonal).length;
  assert.equal(personalCount, 1);
});

// ---------- GET /api/workspaces/:id ----------

test("GET /api/workspaces/:id returns workspace + role + members for the owner", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wget@example.com");
  const ws = await workspaces.create({ name: "Acme", ownerId: userId });

  const res = await request(app).get(`/api/workspaces/${ws.id}`).set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.workspace.id, ws.id);
  assert.equal(res.body.role, "admin");
  assert.equal(res.body.members.length, 1);
  assert.equal(res.body.members[0].userId, userId);
});

test("GET /api/workspaces/:id returns 404 when workspace does not exist", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wget404@example.com");

  const res = await request(app)
    .get("/api/workspaces/00000000-0000-0000-0000-000000000000")
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("GET /api/workspaces/:id returns 403 when caller is not a member", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wgetforbid@example.com");
  const ws = await workspaces.create({ name: "Other", ownerId: "other-user-id" });

  const res = await request(app).get(`/api/workspaces/${ws.id}`).set("Cookie", cookie);

  assert.equal(res.status, 403);
});

// ---------- PATCH /api/workspaces/:id ----------

test("PATCH /api/workspaces/:id updates fields for an admin", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wpatch@example.com");
  const ws = await workspaces.create({ name: "Before", ownerId: userId });

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}`)
    .set("Cookie", cookie)
    .send({ name: "After", color: "#00ff00" });

  assert.equal(res.status, 200);
  assert.equal(res.body.workspace.name, "After");
  assert.equal(res.body.workspace.color, "#00ff00");
});

test("PATCH /api/workspaces/:id returns 400 when no fields are supplied", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wpatchnone@example.com");
  const ws = await workspaces.create({ name: "X", ownerId: userId });

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 400);
});

test("PATCH /api/workspaces/:id returns 403 when caller is editor, not admin", async () => {
  const app = createApp();
  const { cookie: editorCookie, userId: editorId } = await registerAndGetUser(app, "wpatch403@example.com");
  const ws = await workspaces.create({ name: "X", ownerId: "owner-id" });
  await workspaces.addMember(ws.id, editorId, "editor");

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}`)
    .set("Cookie", editorCookie)
    .send({ name: "Sneaky" });

  assert.equal(res.status, 403);
});

// ---------- DELETE /api/workspaces/:id ----------

test("DELETE /api/workspaces/:id deletes a non-personal workspace owned by the caller", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wdel@example.com");
  const ws = await workspaces.create({ name: "Doomed", ownerId: userId });

  const res = await request(app).delete(`/api/workspaces/${ws.id}`).set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(await workspaces.findById(ws.id), null);
});

test("DELETE /api/workspaces/:id returns 403 when trying to delete the personal workspace", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wdelpers@example.com");
  const ws = await workspaces.create({ name: "Personal", ownerId: userId, isPersonal: true });

  const res = await request(app).delete(`/api/workspaces/${ws.id}`).set("Cookie", cookie);

  assert.equal(res.status, 403);
});

test("DELETE /api/workspaces/:id returns 403 when caller is admin-member but not owner", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wdeladmin@example.com");
  const ws = await workspaces.create({ name: "X", ownerId: "owner-id" });
  await workspaces.addMember(ws.id, userId, "admin");

  const res = await request(app).delete(`/api/workspaces/${ws.id}`).set("Cookie", cookie);

  assert.equal(res.status, 403);
});

// ---------- POST /api/workspaces/:id/invite ----------

test("POST /:id/invite issues an invitation for an admin (writes via raw SQL)", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "winvite@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });
  // The invite use case INSERTs into workspace_invitations via raw SQL; stub to accept it.
  let insertedRole: string | null = null;
  setQueryHandler((_sql, params) => {
    insertedRole = (params?.[2] as string) ?? null;
    return { rows: [] };
  });

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/invite`)
    .set("Cookie", cookie)
    .send({ email: "guest@example.com", role: "editor" });

  assert.equal(res.status, 201);
  assert.equal(res.body.invitation.email, "guest@example.com");
  assert.equal(res.body.invitation.role, "editor");
  assert.ok(res.body.invitation.token);
  assert.ok(res.body.invitation.expiresAt);
  assert.equal(insertedRole, "editor");
});

test("POST /:id/invite defaults role to editor when omitted", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "winvitedef@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/invite`)
    .set("Cookie", cookie)
    .send({ email: "guest@example.com" });

  assert.equal(res.status, 201);
  assert.equal(res.body.invitation.role, "editor");
});

test("POST /:id/invite returns 400 on invalid email", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "winvbad@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/invite`)
    .set("Cookie", cookie)
    .send({ email: "not-an-email" });

  assert.equal(res.status, 400);
});

test("POST /:id/invite returns 403 when caller is not an admin", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "winved@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "owner-id" });
  await workspaces.addMember(ws.id, userId, "editor");

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/invite`)
    .set("Cookie", cookie)
    .send({ email: "guest@example.com", role: "viewer" });

  assert.equal(res.status, 403);
});

test("POST /:id/invite returns 403 when inviting to a personal workspace", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "winvpers@example.com");
  const ws = await workspaces.create({ name: "Personal", ownerId: userId, isPersonal: true });

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/invite`)
    .set("Cookie", cookie)
    .send({ email: "guest@example.com" });

  assert.equal(res.status, 403);
});

// ---------- POST /api/workspaces/accept-invite ----------

test("POST /accept-invite accepts a valid invitation and adds the caller as member", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wacc@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "owner-id" });

  setQueryHandler((sql) => {
    if (sql.includes("UPDATE workspace_invitations")) return { rows: [] };
    return {
      rows: [{
        id: "invite-1",
        workspace_id: ws.id,
        email: "wacc@example.com",
        role: "viewer",
        expires_at: new Date(Date.now() + 1_000_000).toISOString(),
        used_at: null,
      }],
    };
  });

  const res = await request(app)
    .post("/api/workspaces/accept-invite")
    .set("Cookie", cookie)
    .send({ token: "valid-token" });

  assert.equal(res.status, 200);
  assert.equal(res.body.workspace.id, ws.id);
  assert.equal(res.body.role, "viewer");
  assert.equal(await workspaces.findMemberRole(ws.id, userId), "viewer");
});

test("POST /accept-invite returns 404 when the token does not match", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wacc404@example.com");
  setQueryHandler(() => ({ rows: [] }));

  const res = await request(app)
    .post("/api/workspaces/accept-invite")
    .set("Cookie", cookie)
    .send({ token: "ghost" });

  assert.equal(res.status, 404);
});

test("POST /accept-invite returns 410 when invitation expired", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "waccexp@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "owner-id" });

  setQueryHandler(() => ({
    rows: [{
      id: "invite-1",
      workspace_id: ws.id,
      email: "waccexp@example.com",
      role: "editor",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      used_at: null,
    }],
  }));

  const res = await request(app)
    .post("/api/workspaces/accept-invite")
    .set("Cookie", cookie)
    .send({ token: "expired" });

  assert.equal(res.status, 410);
});

test("POST /accept-invite returns 401 without auth", async () => {
  const app = createApp();
  const res = await request(app).post("/api/workspaces/accept-invite").send({ token: "x" });
  assert.equal(res.status, 401);
});

test("POST /accept-invite returns 400 when token missing", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wacc400@example.com");

  const res = await request(app)
    .post("/api/workspaces/accept-invite")
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 400);
});

// ---------- GET /api/workspaces/invite/:token (raw SQL, no auth required) ----------

test("GET /invite/:token returns invite metadata for a valid token (no auth required)", async () => {
  const app = createApp();
  setQueryHandler(() => ({
    rows: [{
      id: "inv-1",
      email: "guest@example.com",
      role: "viewer",
      expires_at: new Date(Date.now() + 1_000_000).toISOString(),
      used_at: null,
      workspace_name: "Acme",
    }],
  }));

  const res = await request(app).get("/api/workspaces/invite/some-token");

  assert.equal(res.status, 200);
  assert.equal(res.body.workspaceName, "Acme");
  assert.equal(res.body.role, "viewer");
  assert.equal(res.body.email, "guest@example.com");
});

test("GET /invite/:token returns 404 when the token does not match", async () => {
  const app = createApp();
  setQueryHandler(() => ({ rows: [] }));

  const res = await request(app).get("/api/workspaces/invite/missing");
  assert.equal(res.status, 404);
});

test("GET /invite/:token returns 404 when invitation has been used", async () => {
  const app = createApp();
  setQueryHandler(() => ({
    rows: [{
      id: "inv-1",
      email: "guest@example.com",
      role: "viewer",
      expires_at: new Date(Date.now() + 1_000_000).toISOString(),
      used_at: new Date().toISOString(),
      workspace_name: "Acme",
    }],
  }));

  const res = await request(app).get("/api/workspaces/invite/used-token");
  assert.equal(res.status, 404);
});

test("GET /invite/:token returns 410 when invitation expired", async () => {
  const app = createApp();
  setQueryHandler(() => ({
    rows: [{
      id: "inv-1",
      email: "guest@example.com",
      role: "viewer",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      used_at: null,
      workspace_name: "Acme",
    }],
  }));

  const res = await request(app).get("/api/workspaces/invite/expired");
  assert.equal(res.status, 410);
});

// ---------- GET /api/workspaces/owned-shared (raw SQL) ----------

test("GET /owned-shared forwards rows from the raw SQL query", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "wos@example.com");
  setQueryHandler(() => ({
    rows: [
      { id: "ws-1", name: "Acme Shared" },
      { id: "ws-2", name: "Team B" },
    ],
  }));

  const res = await request(app).get("/api/workspaces/owned-shared").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.workspaces.length, 2);
  assert.equal(res.body.workspaces[0].name, "Acme Shared");
});

test("GET /owned-shared returns 401 without auth", async () => {
  const app = createApp();
  const res = await request(app).get("/api/workspaces/owned-shared");
  assert.equal(res.status, 401);
});

// ---------- PATCH /api/workspaces/:id/members/:userId ----------

test("PATCH /:id/members/:userId updates a member's role when caller is admin", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wrole@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });
  await workspaces.addMember(ws.id, "victim-id", "viewer");

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}/members/victim-id`)
    .set("Cookie", cookie)
    .send({ role: "editor" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(await workspaces.findMemberRole(ws.id, "victim-id"), "editor");
});

test("PATCH /:id/members/:userId returns 403 when caller is not an admin", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wrole403@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "owner-id" });
  await workspaces.addMember(ws.id, userId, "editor");
  await workspaces.addMember(ws.id, "victim-id", "viewer");

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}/members/victim-id`)
    .set("Cookie", cookie)
    .send({ role: "admin" });

  assert.equal(res.status, 403);
});

test("PATCH /:id/members/:userId returns 403 when trying to change the owner's role", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wroleown@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}/members/${userId}`)
    .set("Cookie", cookie)
    .send({ role: "viewer" });

  assert.equal(res.status, 403);
});

test("PATCH /:id/members/:userId returns 400 on invalid role", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wrole400@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });

  const res = await request(app)
    .patch(`/api/workspaces/${ws.id}/members/someone`)
    .set("Cookie", cookie)
    .send({ role: "superadmin" });

  assert.equal(res.status, 400);
});

// ---------- DELETE /api/workspaces/:id/members/:userId ----------

test("DELETE /:id/members/:userId removes a member when caller is admin", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wrm@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });
  await workspaces.addMember(ws.id, "victim-id", "editor");

  const res = await request(app)
    .delete(`/api/workspaces/${ws.id}/members/victim-id`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(await workspaces.findMemberRole(ws.id, "victim-id"), null);
});

test("DELETE /:id/members/:userId lets a non-admin member leave themselves", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wleave@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "owner-id" });
  await workspaces.addMember(ws.id, userId, "editor");

  const res = await request(app)
    .delete(`/api/workspaces/${ws.id}/members/${userId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(await workspaces.findMemberRole(ws.id, userId), null);
});

test("DELETE /:id/members/:userId returns 403 when trying to remove the owner", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "wrmown@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: ownerId });

  const res = await request(app)
    .delete(`/api/workspaces/${ws.id}/members/${ownerId}`)
    .set("Cookie", ownerCookie);

  assert.equal(res.status, 403);
});

test("DELETE /:id/members/:userId returns 403 when a non-admin tries to remove someone else", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wrm403@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: "owner-id" });
  await workspaces.addMember(ws.id, userId, "viewer");
  await workspaces.addMember(ws.id, "victim-id", "editor");

  const res = await request(app)
    .delete(`/api/workspaces/${ws.id}/members/victim-id`)
    .set("Cookie", cookie);

  assert.equal(res.status, 403);
});

// ---------- POST /api/workspaces/:id/transfer-ownership ----------

test("POST /:id/transfer-ownership transfers to an admin member without resources", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wxfer@example.com");
  const newOwnerId = crypto.randomUUID();
  const ws = await workspaces.create({ name: "Team", ownerId: userId });
  await workspaces.addMember(ws.id, newOwnerId, "admin");

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/transfer-ownership`)
    .set("Cookie", cookie)
    .send({ newOwnerId });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.diagramCount, 0);
  assert.equal(res.body.templateCount, 0);
  const updated = await workspaces.findById(ws.id);
  assert.equal(updated?.ownerId, newOwnerId);
});

test("POST /:id/transfer-ownership transfers diagrams + templates when transferResources is true", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wxferres@example.com");
  const newOwnerId = crypto.randomUUID();
  const ws = await workspaces.create({ name: "Team", ownerId: userId });
  await workspaces.addMember(ws.id, newOwnerId, "admin");
  await diagrams.create({ ownerId: userId, title: "D1", workspaceId: ws.id });
  await templates.create({
    creatorId: userId,
    workspaceId: ws.id,
    title: "T1",
    description: "",
    category: "misc",
    elements: [],
    appState: {},
  });

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/transfer-ownership`)
    .set("Cookie", cookie)
    .send({ newOwnerId, transferResources: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.diagramCount, 1);
  assert.equal(res.body.templateCount, 1);
  assert.equal(diagrams.store[0].ownerId, newOwnerId);
  assert.equal(templates.store[0].creatorId, newOwnerId);
});

test("POST /:id/transfer-ownership returns 400 when newOwnerId is not a UUID", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wxfer400@example.com");
  const ws = await workspaces.create({ name: "Team", ownerId: userId });

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/transfer-ownership`)
    .set("Cookie", cookie)
    .send({ newOwnerId: "not-a-uuid" });

  assert.equal(res.status, 400);
});

test("POST /:id/transfer-ownership returns 403 when the target is not an admin member", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wxfernom@example.com");
  const targetId = crypto.randomUUID();
  const ws = await workspaces.create({ name: "Team", ownerId: userId });
  await workspaces.addMember(ws.id, targetId, "editor");

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/transfer-ownership`)
    .set("Cookie", cookie)
    .send({ newOwnerId: targetId });

  assert.equal(res.status, 403);
});

test("POST /:id/transfer-ownership returns 403 when caller is not the owner", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wxfernot@example.com");
  const newOwnerId = crypto.randomUUID();
  const ws = await workspaces.create({ name: "Team", ownerId: "real-owner" });
  await workspaces.addMember(ws.id, userId, "admin");
  await workspaces.addMember(ws.id, newOwnerId, "admin");

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/transfer-ownership`)
    .set("Cookie", cookie)
    .send({ newOwnerId });

  assert.equal(res.status, 403);
});

test("POST /:id/transfer-ownership returns 403 on personal workspaces", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "wxferpers@example.com");
  const newOwnerId = crypto.randomUUID();
  const ws = await workspaces.create({ name: "Personal", ownerId: userId, isPersonal: true });
  await workspaces.addMember(ws.id, newOwnerId, "admin");

  const res = await request(app)
    .post(`/api/workspaces/${ws.id}/transfer-ownership`)
    .set("Cookie", cookie)
    .send({ newOwnerId });

  assert.equal(res.status, 403);
});

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
import { CreateSnapshotUseCase } from "../../application/use-cases/snapshots/create-snapshot";
import { ListSnapshotsUseCase } from "../../application/use-cases/snapshots/list-snapshots";
import { GetSnapshotUseCase } from "../../application/use-cases/snapshots/get-snapshot";
import { RestoreSnapshotUseCase } from "../../application/use-cases/snapshots/restore-snapshot";
import { RenameSnapshotUseCase } from "../../application/use-cases/snapshots/rename-snapshot";
import { DeleteSnapshotUseCase } from "../../application/use-cases/snapshots/delete-snapshot";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createSnapshotRoutes } from "../../infrastructure/http/routes/snapshot.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemorySceneRepository } from "../fakes/in-memory-scene-repository";
import { InMemorySnapshotRepository } from "../fakes/in-memory-snapshot-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";

let diagrams: InMemoryDiagramRepository;
let scenes: InMemorySceneRepository;
let snapshots: InMemorySnapshotRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const workspaces = new InMemoryWorkspaceRepository();
  diagrams = new InMemoryDiagramRepository();
  scenes = new InMemorySceneRepository();
  snapshots = new InMemorySnapshotRepository();
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

  app.use("/api/diagrams/:diagramId/snapshots", createSnapshotRoutes({
    create: new CreateSnapshotUseCase(snapshots, scenes, diagrams),
    list: new ListSnapshotsUseCase(snapshots, diagrams),
    get: new GetSnapshotUseCase(snapshots, diagrams),
    restore: new RestoreSnapshotUseCase(snapshots, scenes, diagrams),
    rename: new RenameSnapshotUseCase(snapshots, diagrams),
    delete: new DeleteSnapshotUseCase(snapshots, diagrams),
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

async function seedDiagramWithScene(ownerId: string, opts?: { elements?: unknown[]; appState?: Record<string, unknown> }) {
  const diagram = await diagrams.create({ ownerId, title: "Snap Test" });
  const scene = await scenes.create({
    diagramId: diagram.id,
    name: "Page 1",
    sortOrder: 0,
    elements: opts?.elements ?? [{ id: "el-1", type: "rectangle" }],
    appState: opts?.appState ?? { theme: "light" },
  });
  return { diagram, scene };
}

beforeEach(() => {
  diagrams = new InMemoryDiagramRepository();
  scenes = new InMemorySceneRepository();
  snapshots = new InMemorySnapshotRepository();
});

// ---------- POST /api/diagrams/:diagramId/snapshots ----------

test("POST creates a manual snapshot and returns formatted body", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-create@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "Before refactor" });

  assert.equal(res.status, 201);
  assert.equal(typeof res.body.snapshot.id, "string");
  assert.equal(res.body.snapshot.diagramId, diagram.id);
  assert.equal(res.body.snapshot.createdBy, userId);
  assert.equal(res.body.snapshot.trigger, "manual");
  assert.equal(res.body.snapshot.name, "Before refactor");
  assert.equal(typeof res.body.snapshot.createdAt, "string");
  assert.equal(res.body.snapshot.elements, undefined, "list shape must not include elements");
  assert.equal(res.body.snapshot.appState, undefined, "list shape must not include appState");

  assert.equal(snapshots.store.length, 1);
  assert.deepEqual(snapshots.store[0].elements, [{ id: "el-1", type: "rectangle" }]);
});

test("POST without name creates an unnamed manual snapshot", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-noname@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 201);
  assert.equal(res.body.snapshot.name, null);
  assert.equal(res.body.snapshot.trigger, "manual");
});

test("POST returns 401 when not authenticated", async () => {
  const app = createApp();
  const res = await request(app)
    .post("/api/diagrams/00000000-0000-0000-0000-000000000000/snapshots")
    .send({});
  assert.equal(res.status, 401);
});

test("POST returns 400 when name exceeds max length", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-badname@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "a".repeat(101) });

  assert.equal(res.status, 400);
});

test("POST returns 400 when name is empty after trim", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-empty@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "   " });

  assert.equal(res.status, 400);
});

test("POST returns 404 when diagram has no scene", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-noscene@example.com");
  const diagram = await diagrams.create({ ownerId: userId, title: "Empty" });

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 404);
});

// ---------- GET /api/diagrams/:diagramId/snapshots ----------

test("GET list returns snapshots as metadata (no elements/appState) ordered newest-first", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-list@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const first = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "First" });
  // Force a measurable createdAt gap so the sort is deterministic
  snapshots.store[0].createdAt = new Date(Date.now() - 1000);
  const second = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "Second" });

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.snapshots.length, 2);
  assert.equal(res.body.snapshots[0].id, second.body.snapshot.id);
  assert.equal(res.body.snapshots[1].id, first.body.snapshot.id);
  assert.equal(res.body.snapshots[0].elements, undefined);
  assert.equal(res.body.snapshots[0].appState, undefined);
});

test("GET list returns 401 without auth", async () => {
  const app = createApp();
  const res = await request(app).get(
    "/api/diagrams/00000000-0000-0000-0000-000000000000/snapshots",
  );
  assert.equal(res.status, 401);
});

test("GET list returns 404 when the user has no access to the diagram", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "snap-list-owner@example.com");
  const { cookie: outsiderCookie } = await registerAndGetUser(app, "snap-list-out@example.com");
  const { diagram } = await seedDiagramWithScene(ownerId);
  await request(app).post(`/api/diagrams/${diagram.id}/snapshots`).set("Cookie", ownerCookie).send({});

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", outsiderCookie);
  assert.equal(res.status, 404);
});

test("GET list allows viewer-role access", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "snap-vlistown@example.com");
  const { cookie: viewerCookie, userId: viewerId } = await registerAndGetUser(app, "snap-vlist@example.com");
  const { diagram } = await seedDiagramWithScene(ownerId);
  diagrams.members.push({ diagramId: diagram.id, userId: viewerId, role: "viewer" });
  await request(app).post(`/api/diagrams/${diagram.id}/snapshots`).set("Cookie", ownerCookie).send({ name: "Owner snap" });

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", viewerCookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.snapshots.length, 1);
});

// ---------- GET /api/diagrams/:diagramId/snapshots/:snapshotId ----------

test("GET single snapshot returns full body including elements and appState", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-get@example.com");
  const { diagram } = await seedDiagramWithScene(userId, {
    elements: [{ id: "el-a", type: "ellipse" }],
    appState: { gridSize: 20 },
  });
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "Snap one" });
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.snapshot.id, snapshotId);
  assert.equal(res.body.snapshot.name, "Snap one");
  assert.deepEqual(res.body.snapshot.elements, [{ id: "el-a", type: "ellipse" }]);
  assert.deepEqual(res.body.snapshot.appState, { gridSize: 20 });
});

test("GET single snapshot returns 404 when snapshot does not exist", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-get404@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots/00000000-0000-0000-0000-000000000000`)
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("GET single snapshot returns 404 when user lacks access to its diagram", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "snap-getown@example.com");
  const { cookie: outsiderCookie } = await registerAndGetUser(app, "snap-getout@example.com");
  const { diagram } = await seedDiagramWithScene(ownerId);
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", ownerCookie)
    .send({});
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", outsiderCookie);

  assert.equal(res.status, 404);
});

// ---------- POST /api/diagrams/:diagramId/snapshots/:snapshotId/restore ----------

test("POST restore mutates the underlying scene back to the snapshot contents", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-restore@example.com");
  const originalElements = [{ id: "el-old", type: "rectangle" }];
  const originalAppState = { theme: "light" };
  const { diagram, scene } = await seedDiagramWithScene(userId, {
    elements: originalElements,
    appState: originalAppState,
  });
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "Frozen" });
  const snapshotId = createRes.body.snapshot.id as string;

  // Simulate editing the live scene after the snapshot was taken
  await scenes.updateScene(scene.id, [{ id: "el-new", type: "diamond" }], { theme: "dark" });
  assert.deepEqual(scenes.store[0].elements, [{ id: "el-new", type: "diamond" }]);

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}/restore`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.diagramId, diagram.id);

  // Scene mutated back to the snapshot state
  assert.deepEqual(scenes.store[0].elements, originalElements);
  assert.deepEqual(scenes.store[0].appState, originalAppState);

  // Pre-restore backup snapshot was created
  const backup = snapshots.store.find((s) => s.name === "Pre-restore backup");
  assert.ok(backup, "pre-restore backup snapshot should be created");
  assert.deepEqual(backup!.elements, [{ id: "el-new", type: "diamond" }]);
});

test("POST restore returns 403 when caller is a viewer", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "snap-rstown@example.com");
  const { cookie: viewerCookie, userId: viewerId } = await registerAndGetUser(app, "snap-rstview@example.com");
  const { diagram } = await seedDiagramWithScene(ownerId);
  diagrams.members.push({ diagramId: diagram.id, userId: viewerId, role: "viewer" });
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", ownerCookie)
    .send({ name: "Owner snap" });
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}/restore`)
    .set("Cookie", viewerCookie);

  assert.equal(res.status, 403);
});

test("POST restore returns 404 when snapshot does not exist", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-rst404@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots/00000000-0000-0000-0000-000000000000/restore`)
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

// ---------- PATCH /api/diagrams/:diagramId/snapshots/:snapshotId ----------

test("PATCH renames a snapshot and returns the formatted snapshot", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-rename@example.com");
  const { diagram } = await seedDiagramWithScene(userId);
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({});
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", cookie)
    .send({ name: "Renamed" });

  assert.equal(res.status, 200);
  assert.equal(res.body.snapshot.id, snapshotId);
  assert.equal(res.body.snapshot.name, "Renamed");
  assert.equal(snapshots.store.find((s) => s.id === snapshotId)!.name, "Renamed");
});

test("PATCH with null clears the snapshot name", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-unname@example.com");
  const { diagram } = await seedDiagramWithScene(userId);
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "Will go away" });
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", cookie)
    .send({ name: null });

  assert.equal(res.status, 200);
  assert.equal(res.body.snapshot.name, null);
});

test("PATCH returns 400 when name is missing (schema requires nullable, not optional)", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-renamebad@example.com");
  const { diagram } = await seedDiagramWithScene(userId);
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({});
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 400);
});

test("PATCH returns 403 when caller is a viewer", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "snap-renown@example.com");
  const { cookie: viewerCookie, userId: viewerId } = await registerAndGetUser(app, "snap-renview@example.com");
  const { diagram } = await seedDiagramWithScene(ownerId);
  diagrams.members.push({ diagramId: diagram.id, userId: viewerId, role: "viewer" });
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", ownerCookie)
    .send({});
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .patch(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", viewerCookie)
    .send({ name: "Forbidden" });

  assert.equal(res.status, 403);
});

// ---------- DELETE /api/diagrams/:diagramId/snapshots/:snapshotId ----------

test("DELETE removes the snapshot (hard delete)", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-del@example.com");
  const { diagram } = await seedDiagramWithScene(userId);
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie)
    .send({ name: "To delete" });
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(snapshots.store.find((s) => s.id === snapshotId), undefined);

  const listRes = await request(app)
    .get(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", cookie);
  assert.equal(listRes.body.snapshots.length, 0);
});

test("DELETE returns 404 when snapshot does not exist", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "snap-del404@example.com");
  const { diagram } = await seedDiagramWithScene(userId);

  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/snapshots/00000000-0000-0000-0000-000000000000`)
    .set("Cookie", cookie);

  assert.equal(res.status, 404);
});

test("DELETE returns 403 when caller is a viewer", async () => {
  const app = createApp();
  const { cookie: ownerCookie, userId: ownerId } = await registerAndGetUser(app, "snap-delown@example.com");
  const { cookie: viewerCookie, userId: viewerId } = await registerAndGetUser(app, "snap-delview@example.com");
  const { diagram } = await seedDiagramWithScene(ownerId);
  diagrams.members.push({ diagramId: diagram.id, userId: viewerId, role: "viewer" });
  const createRes = await request(app)
    .post(`/api/diagrams/${diagram.id}/snapshots`)
    .set("Cookie", ownerCookie)
    .send({ name: "Mine" });
  const snapshotId = createRes.body.snapshot.id as string;

  const res = await request(app)
    .delete(`/api/diagrams/${diagram.id}/snapshots/${snapshotId}`)
    .set("Cookie", viewerCookie);

  assert.equal(res.status, 403);
  assert.ok(snapshots.store.find((s) => s.id === snapshotId), "snapshot should still exist");
});

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
import { GetDriveStatusUseCase } from "../../application/use-cases/drive/get-drive-status";
import { ToggleDriveBackupUseCase } from "../../application/use-cases/drive/toggle-drive-backup";
import { DisconnectDriveUseCase } from "../../application/use-cases/drive/disconnect-drive";
import { ExportToDriveUseCase } from "../../application/use-cases/drive/export-to-drive";
import { ListDriveFilesUseCase } from "../../application/use-cases/drive/list-drive-files";
import { ImportFromDriveUseCase } from "../../application/use-cases/drive/import-from-drive";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createDriveRoutes } from "../../infrastructure/http/routes/drive.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryDriveBackupRepository } from "../fakes/in-memory-drive-backup-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";
import { FakeGoogleDriveService } from "../fakes/fake-google-drive-service";
import { StubGoogleTokenRefresher } from "../fakes/stub-google-token-refresher";
import { InMemorySiteSettingsRepository } from "../fakes/in-memory-site-settings-repository";
import { FakeOAuthProvider } from "../fakes/fake-oauth-provider";

let oauth: InMemoryOAuthTokenRepository;
let driveBackup: InMemoryDriveBackupRepository;
let driveService: FakeGoogleDriveService;
let tokenRefresher: StubGoogleTokenRefresher;
let diagrams: InMemoryDiagramRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  oauth = new InMemoryOAuthTokenRepository();
  driveBackup = new InMemoryDriveBackupRepository();
  driveService = new FakeGoogleDriveService();
  tokenRefresher = new StubGoogleTokenRefresher();
  diagrams = new InMemoryDiagramRepository();
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

  app.use("/api/drive", createDriveRoutes(
    {
      getDriveStatus: new GetDriveStatusUseCase(oauth, driveBackup),
      toggleDriveBackup: new ToggleDriveBackupUseCase(driveBackup, oauth),
      disconnectDrive: new DisconnectDriveUseCase(driveBackup),
      exportToDrive: new ExportToDriveUseCase(driveService, tokenRefresher),
      listDriveFiles: new ListDriveFilesUseCase(driveService, driveBackup, tokenRefresher),
      importFromDrive: new ImportFromDriveUseCase(driveService, diagrams, tokenRefresher),
    },
    tokenRefresher,
    requireAuth,
  ));

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

async function connectDrive(userId: string, scopes = "openid drive.file"): Promise<void> {
  await oauth.upsert({
    userId,
    provider: "google",
    accessToken: "access-tok",
    refreshToken: "refresh-tok",
    tokenExpiresAt: new Date(Date.now() + 3_600_000),
    scopes,
  });
  tokenRefresher.setToken(userId, "access-tok");
}

beforeEach(() => {
  oauth = new InMemoryOAuthTokenRepository();
  driveBackup = new InMemoryDriveBackupRepository();
  driveService = new FakeGoogleDriveService();
  tokenRefresher = new StubGoogleTokenRefresher();
  diagrams = new InMemoryDiagramRepository();
});

const VALID_FOLDER_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123";

test("GET /api/drive/status reports disconnected by default", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "dr1@example.com");

  const res = await request(app).get("/api/drive/status").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.connected, false);
  assert.equal(res.body.autoBackupEnabled, false);
});

test("GET /api/drive/status reports connected when drive scope is granted", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr2@example.com");
  await connectDrive(userId);

  const res = await request(app).get("/api/drive/status").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.connected, true);
  assert.ok(res.body.scopes.includes("drive.file"));
});

test("POST /api/drive/backup/toggle enables backup when scope is granted", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr3@example.com");
  await connectDrive(userId);

  const res = await request(app)
    .post("/api/drive/backup/toggle")
    .set("Cookie", cookie)
    .send({ enabled: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.enabled, true);
});

test("POST /api/drive/backup/toggle returns 401 when drive scope not granted", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "dr4@example.com");

  const res = await request(app)
    .post("/api/drive/backup/toggle")
    .set("Cookie", cookie)
    .send({ enabled: true });

  assert.equal(res.status, 401);
});

test("POST /api/drive/backup/toggle rejects non-boolean payload with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "dr5@example.com");

  const res = await request(app)
    .post("/api/drive/backup/toggle")
    .set("Cookie", cookie)
    .send({ enabled: "yes" });

  assert.equal(res.status, 400);
});

test("POST /api/drive/disconnect deletes drive settings", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr6@example.com");
  await connectDrive(userId);
  await driveBackup.upsertSettings(userId, { enabled: true });

  const res = await request(app).post("/api/drive/disconnect").set("Cookie", cookie).send({});
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(driveBackup.settings.has(userId), false);
});

test("POST /api/drive/export uploads to drive and returns metadata", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr7@example.com");
  await connectDrive(userId);

  const res = await request(app)
    .post("/api/drive/export")
    .set("Cookie", cookie)
    .send({
      format: "excalidraw",
      targetFolderId: VALID_FOLDER_ID,
      content: "{\"elements\":[]}",
      fileName: "scene.excalidraw",
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.driveFileId);
  assert.ok(res.body.webViewLink);
  assert.equal(driveService.uploads.length, 1);
  assert.equal(driveService.uploads[0].mimeType, "application/json");
});

test("POST /api/drive/export rejects invalid format with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "dr8@example.com");

  const res = await request(app)
    .post("/api/drive/export")
    .set("Cookie", cookie)
    .send({
      format: "pdf",
      targetFolderId: VALID_FOLDER_ID,
      content: "x",
      fileName: "x",
    });

  assert.equal(res.status, 400);
});

test("POST /api/drive/export rejects malformed folder id with 400", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "dr9@example.com");

  const res = await request(app)
    .post("/api/drive/export")
    .set("Cookie", cookie)
    .send({
      format: "png",
      targetFolderId: "bad id with spaces",
      content: "x",
      fileName: "x.png",
    });

  assert.equal(res.status, 400);
});

test("GET /api/drive/picker-token returns access token", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr10@example.com");
  await connectDrive(userId);

  const res = await request(app).get("/api/drive/picker-token").set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.accessToken, "access-tok");
});

test("GET /api/drive/picker-token returns 401 when drive not connected", async () => {
  const app = createApp();
  const { cookie } = await registerAndGetUser(app, "dr11@example.com");

  const res = await request(app).get("/api/drive/picker-token").set("Cookie", cookie);
  assert.equal(res.status, 401);
});

test("GET /api/drive/files lists files in given folder", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr12@example.com");
  await connectDrive(userId);

  driveService.files = [
    { id: "f1", name: "Scene.excalidraw", mimeType: "application/json", modifiedTime: "2026-01-01" },
    { id: "d1", name: "Sub", mimeType: "application/vnd.google-apps.folder", modifiedTime: "2026-01-02" },
  ];

  const res = await request(app)
    .get(`/api/drive/files?folderId=${VALID_FOLDER_ID}`)
    .set("Cookie", cookie);

  assert.equal(res.status, 200);
  assert.equal(res.body.files.length, 2);
  assert.equal(res.body.files[0].isFolder, true); // folders sorted first
  assert.equal(res.body.currentFolderId, VALID_FOLDER_ID);
});

test("GET /api/drive/files rejects malformed folderId with 400", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr13@example.com");
  await connectDrive(userId);

  const res = await request(app).get("/api/drive/files?folderId=invalid id").set("Cookie", cookie);
  assert.equal(res.status, 400);
});

test("POST /api/drive/import imports an excalidraw file into a new diagram", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr14@example.com");
  await connectDrive(userId);
  driveService.contentByFileId.set(VALID_FOLDER_ID, JSON.stringify({ elements: [{ id: "el-1" }], appState: { theme: "dark" } }));

  const res = await request(app)
    .post("/api/drive/import")
    .set("Cookie", cookie)
    .send({ fileId: VALID_FOLDER_ID, fileName: "myscene.excalidraw" });

  assert.equal(res.status, 200);
  assert.equal(res.body.title, "myscene");
  assert.ok(res.body.diagramId);
  assert.equal(diagrams.store.length, 1);
});

test("POST /api/drive/import returns 400 on non-JSON content", async () => {
  const app = createApp();
  const { cookie, userId } = await registerAndGetUser(app, "dr15@example.com");
  await connectDrive(userId);
  driveService.contentByFileId.set(VALID_FOLDER_ID, "not json");

  const res = await request(app)
    .post("/api/drive/import")
    .set("Cookie", cookie)
    .send({ fileId: VALID_FOLDER_ID, fileName: "x.excalidraw" });

  assert.equal(res.status, 400);
});

test("GET /api/drive/status without auth returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/drive/status");
  assert.equal(res.status, 401);
});

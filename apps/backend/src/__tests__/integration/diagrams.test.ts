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
import { CreateDiagramUseCase } from "../../application/use-cases/diagrams/create-diagram";
import { GetDiagramUseCase } from "../../application/use-cases/diagrams/get-diagram";
import { ListDiagramsUseCase } from "../../application/use-cases/diagrams/list-diagrams";
import { UpdateDiagramUseCase } from "../../application/use-cases/diagrams/update-diagram";
import { DeleteDiagramUseCase } from "../../application/use-cases/diagrams/delete-diagram";
import { SearchDiagramsUseCase } from "../../application/use-cases/diagrams/search-diagrams";
import { UpdateThumbnailUseCase } from "../../application/use-cases/diagrams/update-thumbnail";
import { ToggleStarUseCase } from "../../application/use-cases/diagrams/toggle-star";
import { DuplicateDiagramUseCase } from "../../application/use-cases/diagrams/duplicate-diagram";
import { MoveDiagramUseCase } from "../../application/use-cases/folders/move-diagram";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createDiagramRoutes } from "../../infrastructure/http/routes/diagram.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryFolderRepository } from "../fakes/in-memory-folder-repository";
import { FakeHasher } from "../fakes/fake-hasher";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { GoogleAuthUseCase } from "../../application/use-cases/auth/google-auth";
import { GitHubAuthUseCase } from "../../application/use-cases/auth/github-auth";
import { UnlinkOAuthUseCase } from "../../application/use-cases/auth/unlink-oauth";
import { TransferDiagramOwnershipUseCase } from "../../application/use-cases/diagrams/transfer-ownership";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";

let diagrams: InMemoryDiagramRepository;

function createApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
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
    register: new RegisterUseCase(users, sessions, hasher),
    login: new LoginUseCase(users, sessions, hasher, new NoopAuditLogger()),
    logout: new LogoutUseCase(sessions),
    getCurrentUser,
    updateProfile: new UpdateProfileUseCase(users),
    changePassword: new ChangePasswordUseCase(users, hasher),
    acceptInvite: new AcceptInviteUseCase(users, sessions, invitations, hasher),
    forgotPassword: new ForgotPasswordUseCase(users, passwordResets, emailService),
    resetPassword: new ResetPasswordUseCase(users, sessions, passwordResets, hasher),
    deleteAccount: new DeleteAccountUseCase(users, hasher, new NoopAuditLogger(), new InMemoryWorkspaceRepository()),
    googleAuth: new GoogleAuthUseCase(users, sessions, new InMemoryOAuthTokenRepository()),
    githubAuth: new GitHubAuthUseCase(users, sessions, new InMemoryOAuthTokenRepository()),
    unlinkOAuth: new UnlinkOAuthUseCase(users, new InMemoryOAuthTokenRepository()),
  }, requireAuth));
  const folders = new InMemoryFolderRepository();
  app.use("/api/diagrams", createDiagramRoutes({
    create: new CreateDiagramUseCase(diagrams),
    get: new GetDiagramUseCase(diagrams),
    list: new ListDiagramsUseCase(diagrams),
    search: new SearchDiagramsUseCase(diagrams),
    update: new UpdateDiagramUseCase(diagrams),
    updateThumbnail: new UpdateThumbnailUseCase(diagrams),
    delete: new DeleteDiagramUseCase(diagrams),
    toggleStar: new ToggleStarUseCase(diagrams),
    duplicate: new DuplicateDiagramUseCase(diagrams),
    move: new MoveDiagramUseCase(diagrams, folders),
    transferOwnership: new TransferDiagramOwnershipUseCase(diagrams, new InMemoryWorkspaceRepository(), new NoopAuditLogger()),
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
  diagrams = new InMemoryDiagramRepository();
});

test("diagram CRUD works for owner", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "owner@example.com");

  const createRes = await request(app)
    .post("/api/diagrams")
    .set("Cookie", cookie)
    .send({ title: "Roadmap" });
  assert.equal(createRes.status, 201);
  const diagramId = createRes.body.diagram.id as string;

  const listRes = await request(app).get("/api/diagrams").set("Cookie", cookie);
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.diagrams.length, 1);
  assert.equal(listRes.body.diagrams[0].title, "Roadmap");

  const getRes = await request(app).get(`/api/diagrams/${diagramId}`).set("Cookie", cookie);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.diagram.id, diagramId);

  const patchRes = await request(app)
    .patch(`/api/diagrams/${diagramId}`)
    .set("Cookie", cookie)
    .send({ title: "Roadmap v2", elements: [{ id: "el-1" }] });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.diagram.title, "Roadmap v2");

  const deleteRes = await request(app).delete(`/api/diagrams/${diagramId}`).set("Cookie", cookie);
  assert.equal(deleteRes.status, 200);

  const listAfter = await request(app).get("/api/diagrams").set("Cookie", cookie);
  assert.equal(listAfter.body.diagrams.length, 0);
});

test("membership and permissions are enforced", async () => {
  const app = createApp();
  const ownerCookie = await registerAndGetCookie(app, "owner@example.com");
  const memberCookie = await registerAndGetCookie(app, "member@example.com");

  const createRes = await request(app)
    .post("/api/diagrams")
    .set("Cookie", ownerCookie)
    .send({ title: "Shared board" });
  assert.equal(createRes.status, 201);
  const diagramId = createRes.body.diagram.id as string;

  // Add member as viewer
  // memberUserId was unused placeholder — removed
  // We need to find the member's user ID from the session repository
  // For simplicity, add member directly to diagrams repo
  const memberRes = await request(app).get("/api/auth/me").set("Cookie", memberCookie);
  const memberId = memberRes.body.user.id as string;
  diagrams.members.push({ diagramId, userId: memberId, role: "viewer" });

  // Viewer can see but not edit
  const memberGet = await request(app)
    .get(`/api/diagrams/${diagramId}`)
    .set("Cookie", memberCookie);
  assert.equal(memberGet.status, 200);

  const viewerPatch = await request(app)
    .patch(`/api/diagrams/${diagramId}`)
    .set("Cookie", memberCookie)
    .send({ title: "Nope" });
  assert.equal(viewerPatch.status, 403);

  // Upgrade to editor
  diagrams.members[diagrams.members.length - 1].role = "editor";
  const editorPatch = await request(app)
    .patch(`/api/diagrams/${diagramId}`)
    .set("Cookie", memberCookie)
    .send({ title: "Edited by member" });
  assert.equal(editorPatch.status, 200);
  assert.equal(editorPatch.body.diagram.title, "Edited by member");

  // Non-owner cannot delete
  const memberDelete = await request(app)
    .delete(`/api/diagrams/${diagramId}`)
    .set("Cookie", memberCookie);
  assert.equal(memberDelete.status, 403);
});

test("unauthenticated requests are blocked", async () => {
  const app = createApp();
  const res = await request(app).get("/api/diagrams");
  assert.equal(res.status, 401);
});

test("search diagrams", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "search@example.com");

  await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Alpha Design" });
  await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Beta Plan" });

  const res = await request(app).get("/api/diagrams/search?q=alpha").set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.diagrams.length, 1);
  assert.equal(res.body.diagrams[0].title, "Alpha Design");
});

test("search with empty query returns 400", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "search400@example.com");

  const res = await request(app).get("/api/diagrams/search").set("Cookie", cookie);
  assert.equal(res.status, 400);
});

test("update thumbnail", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "thumb@example.com");

  const createRes = await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Thumb" });
  const diagramId = createRes.body.diagram.id as string;

  const res = await request(app)
    .put(`/api/diagrams/${diagramId}/thumbnail`)
    .set("Cookie", cookie)
    .send({ thumbnail: "data:image/png;base64,abc" });
  assert.equal(res.status, 200);
});

test("move diagram to folder", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "move@example.com");

  const createRes = await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Movable" });
  const diagramId = createRes.body.diagram.id as string;

  const res = await request(app)
    .post(`/api/diagrams/${diagramId}/move`)
    .set("Cookie", cookie)
    .send({ folderId: null });
  assert.equal(res.status, 200);
});

test("toggle star", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "star@example.com");

  const createRes = await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Starrable" });
  const diagramId = createRes.body.diagram.id as string;

  const starOn = await request(app)
    .patch(`/api/diagrams/${diagramId}/star`)
    .set("Cookie", cookie)
    .send({ starred: true });
  assert.equal(starOn.status, 200);

  const starOff = await request(app)
    .patch(`/api/diagrams/${diagramId}/star`)
    .set("Cookie", cookie)
    .send({ starred: false });
  assert.equal(starOff.status, 200);
});

test("toggle star without boolean returns 400", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "starbad@example.com");

  const createRes = await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "NoStar" });
  const diagramId = createRes.body.diagram.id as string;

  const res = await request(app)
    .patch(`/api/diagrams/${diagramId}/star`)
    .set("Cookie", cookie)
    .send({});
  assert.equal(res.status, 400);
});

test("duplicate diagram", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "dup@example.com");

  const createRes = await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Original" });
  const originalId = createRes.body.diagram.id as string;

  const res = await request(app)
    .post(`/api/diagrams/${originalId}/duplicate`)
    .set("Cookie", cookie);
  assert.equal(res.status, 201);
  assert.notEqual(res.body.diagram.id, originalId);
});

test("transfer ownership", async () => {
  const app = createApp();
  const cookie1 = await registerAndGetCookie(app, "owner1@example.com");
  const cookie2 = await registerAndGetCookie(app, "owner2@example.com");

  const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie2);
  const user2Id = meRes.body.user.id as string;

  const createRes = await request(app).post("/api/diagrams").set("Cookie", cookie1).send({ title: "Transfer me" });
  const diagramId = createRes.body.diagram.id as string;

  const res = await request(app)
    .post("/api/diagrams/transfer-ownership")
    .set("Cookie", cookie1)
    .send({ diagramIds: [diagramId], newOwnerId: user2Id });
  assert.equal(res.status, 200);
});

test("validation rejects invalid UUID in params", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "uuid@example.com");

  const res = await request(app).get("/api/diagrams/not-a-uuid").set("Cookie", cookie);
  assert.equal(res.status, 400);
});

test("list diagrams with folderId=null filter", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "folder@example.com");

  await request(app).post("/api/diagrams").set("Cookie", cookie).send({ title: "Root diagram" });

  const res = await request(app).get("/api/diagrams?folderId=null").set("Cookie", cookie);
  assert.equal(res.status, 200);
  assert.ok(res.body.diagrams.length >= 1);
});

test("create diagram with all optional fields", async () => {
  const app = createApp();
  const cookie = await registerAndGetCookie(app, "full@example.com");

  const res = await request(app)
    .post("/api/diagrams")
    .set("Cookie", cookie)
    .send({ title: "Full", elements: [{ id: "e1" }], appState: { theme: "dark" } });
  assert.equal(res.status, 201);
});

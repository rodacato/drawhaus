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
import { NoopEmailService } from "../fakes/noop-email-service";

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
    login: new LoginUseCase(users, sessions, hasher),
    logout: new LogoutUseCase(sessions),
    getCurrentUser,
    updateProfile: new UpdateProfileUseCase(users),
    changePassword: new ChangePasswordUseCase(users, hasher),
    acceptInvite: new AcceptInviteUseCase(users, sessions, invitations, hasher),
    forgotPassword: new ForgotPasswordUseCase(users, passwordResets, emailService),
    resetPassword: new ResetPasswordUseCase(users, sessions, passwordResets, hasher),
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

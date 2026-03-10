import Honeybadger from "@honeybadger-io/js";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./infrastructure/config";
import { initSchema } from "./infrastructure/db";
import { logger } from "./infrastructure/logger";
import { requestId } from "./infrastructure/http/middleware/request-id";
import { requestLogger } from "./infrastructure/http/middleware/request-logger";

// --- Honeybadger (must be configured before other imports) ---
if (config.honeybadgerApiKey) {
  Honeybadger.configure({
    apiKey: config.honeybadgerApiKey,
    environment: config.nodeEnv,
  });
}

// --- Repositories ---
import { PgUserRepository } from "./infrastructure/persistence/pg-user-repository";
import { PgSessionRepository } from "./infrastructure/persistence/pg-session-repository";
import { PgDiagramRepository } from "./infrastructure/persistence/pg-diagram-repository";
import { PgShareRepository } from "./infrastructure/persistence/pg-share-repository";
import { PgSiteSettingsRepository } from "./infrastructure/persistence/pg-site-settings-repository";
import { PgFolderRepository } from "./infrastructure/persistence/pg-folder-repository";
import { PgSceneRepository } from "./infrastructure/persistence/pg-scene-repository";
import { PgCommentRepository } from "./infrastructure/persistence/pg-comment-repository";

// --- Services ---
import { BcryptHasher } from "./infrastructure/services/bcrypt-hasher";

// --- Use Cases: Auth ---
import { RegisterUseCase } from "./application/use-cases/auth/register";
import { LoginUseCase } from "./application/use-cases/auth/login";
import { LogoutUseCase } from "./application/use-cases/auth/logout";
import { GetCurrentUserUseCase } from "./application/use-cases/auth/get-current-user";
import { UpdateProfileUseCase } from "./application/use-cases/auth/update-profile";
import { ChangePasswordUseCase } from "./application/use-cases/auth/change-password";

// --- Use Cases: Diagrams ---
import { CreateDiagramUseCase } from "./application/use-cases/diagrams/create-diagram";
import { GetDiagramUseCase } from "./application/use-cases/diagrams/get-diagram";
import { ListDiagramsUseCase } from "./application/use-cases/diagrams/list-diagrams";
import { SearchDiagramsUseCase } from "./application/use-cases/diagrams/search-diagrams";
import { UpdateDiagramUseCase } from "./application/use-cases/diagrams/update-diagram";
import { DeleteDiagramUseCase } from "./application/use-cases/diagrams/delete-diagram";
import { UpdateThumbnailUseCase } from "./application/use-cases/diagrams/update-thumbnail";
import { ToggleStarUseCase } from "./application/use-cases/diagrams/toggle-star";
import { DuplicateDiagramUseCase } from "./application/use-cases/diagrams/duplicate-diagram";

// --- Use Cases: Folders ---
import { CreateFolderUseCase } from "./application/use-cases/folders/create-folder";
import { ListFoldersUseCase } from "./application/use-cases/folders/list-folders";
import { RenameFolderUseCase } from "./application/use-cases/folders/rename-folder";
import { DeleteFolderUseCase } from "./application/use-cases/folders/delete-folder";
import { MoveDiagramUseCase } from "./application/use-cases/folders/move-diagram";

// --- Use Cases: Share ---
import { CreateShareLinkUseCase } from "./application/use-cases/share/create-link";
import { ResolveLinkUseCase } from "./application/use-cases/share/resolve-link";
import { ListLinksUseCase } from "./application/use-cases/share/list-links";
import { DeleteLinkUseCase } from "./application/use-cases/share/delete-link";

// --- Use Cases: Admin ---
import { ListUsersUseCase } from "./application/use-cases/admin/list-users";
import { AdminUpdateUserUseCase } from "./application/use-cases/admin/update-user";
import { GetSiteSettingsUseCase } from "./application/use-cases/admin/get-site-settings";
import { UpdateSiteSettingsUseCase } from "./application/use-cases/admin/update-site-settings";
import { GetMetricsUseCase } from "./application/use-cases/admin/get-metrics";

// --- Use Cases: Scenes ---
import { ListScenesUseCase } from "./application/use-cases/scenes/list-scenes";
import { GetSceneUseCase } from "./application/use-cases/scenes/get-scene";
import { CreateSceneUseCase } from "./application/use-cases/scenes/create-scene";
import { RenameSceneUseCase } from "./application/use-cases/scenes/rename-scene";
import { DeleteSceneUseCase } from "./application/use-cases/scenes/delete-scene";

// --- Use Cases: Comments ---
import { ListCommentsUseCase } from "./application/use-cases/comments/list-comments";
import { CreateCommentUseCase } from "./application/use-cases/comments/create-comment";
import { ReplyCommentUseCase } from "./application/use-cases/comments/reply-comment";
import { ResolveCommentUseCase } from "./application/use-cases/comments/resolve-comment";
import { DeleteCommentUseCase } from "./application/use-cases/comments/delete-comment";

// --- Use Cases: Realtime ---
import { JoinRoomUseCase } from "./application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "./application/use-cases/realtime/join-room-guest";
import { SaveSceneUseCase } from "./application/use-cases/realtime/save-scene";

// --- HTTP Routes ---
import { createAuthRoutes } from "./infrastructure/http/routes/auth.routes";
import { createDiagramRoutes } from "./infrastructure/http/routes/diagram.routes";
import { createFolderRoutes } from "./infrastructure/http/routes/folder.routes";
import { createShareRoutes } from "./infrastructure/http/routes/share.routes";
import { createAdminRoutes } from "./infrastructure/http/routes/admin.routes";
import { createSceneRoutes } from "./infrastructure/http/routes/scene.routes";
import { createCommentRoutes } from "./infrastructure/http/routes/comment.routes";
import { createRequireAuth } from "./infrastructure/http/middleware/require-auth";

// --- Socket ---
import { setupSocketServer } from "./infrastructure/socket";

// ============================================================
// Composition Root
// ============================================================

const userRepo = new PgUserRepository();
const sessionRepo = new PgSessionRepository();
const diagramRepo = new PgDiagramRepository();
const shareRepo = new PgShareRepository();
const siteSettingsRepo = new PgSiteSettingsRepository();
const folderRepo = new PgFolderRepository();
const sceneRepo = new PgSceneRepository();
const commentRepo = new PgCommentRepository();
const hasher = new BcryptHasher();

// Auth
const register = new RegisterUseCase(userRepo, sessionRepo, hasher, siteSettingsRepo);
const login = new LoginUseCase(userRepo, sessionRepo, hasher);
const logout = new LogoutUseCase(sessionRepo);
const getCurrentUser = new GetCurrentUserUseCase(sessionRepo);
const updateProfile = new UpdateProfileUseCase(userRepo);
const changePassword = new ChangePasswordUseCase(userRepo, hasher);

// Diagrams
const createDiagram = new CreateDiagramUseCase(diagramRepo);
const getDiagram = new GetDiagramUseCase(diagramRepo);
const listDiagrams = new ListDiagramsUseCase(diagramRepo);
const searchDiagrams = new SearchDiagramsUseCase(diagramRepo);
const updateDiagram = new UpdateDiagramUseCase(diagramRepo);
const deleteDiagram = new DeleteDiagramUseCase(diagramRepo);
const updateThumbnail = new UpdateThumbnailUseCase(diagramRepo);
const toggleStar = new ToggleStarUseCase(diagramRepo);
const duplicateDiagram = new DuplicateDiagramUseCase(diagramRepo);

// Folders
const createFolder = new CreateFolderUseCase(folderRepo);
const listFolders = new ListFoldersUseCase(folderRepo);
const renameFolder = new RenameFolderUseCase(folderRepo);
const deleteFolder = new DeleteFolderUseCase(folderRepo);
const moveDiagram = new MoveDiagramUseCase(diagramRepo, folderRepo);

// Share
const createLink = new CreateShareLinkUseCase(shareRepo, diagramRepo);
const resolveLink = new ResolveLinkUseCase(shareRepo, diagramRepo);
const listLinks = new ListLinksUseCase(shareRepo, diagramRepo);
const deleteLink = new DeleteLinkUseCase(shareRepo);

// Admin
const listUsers = new ListUsersUseCase(userRepo);
const adminUpdateUser = new AdminUpdateUserUseCase(userRepo, sessionRepo);
const getSettings = new GetSiteSettingsUseCase(siteSettingsRepo);
const updateSettings = new UpdateSiteSettingsUseCase(siteSettingsRepo);
const getMetrics = new GetMetricsUseCase();

// Scenes
const listScenes = new ListScenesUseCase(sceneRepo, diagramRepo);
const getScene = new GetSceneUseCase(sceneRepo, diagramRepo);
const createScene = new CreateSceneUseCase(sceneRepo, diagramRepo);
const renameScene = new RenameSceneUseCase(sceneRepo, diagramRepo);
const deleteScene = new DeleteSceneUseCase(sceneRepo, diagramRepo);

// Comments
const listComments = new ListCommentsUseCase(commentRepo, diagramRepo);
const createComment = new CreateCommentUseCase(commentRepo, diagramRepo);
const replyComment = new ReplyCommentUseCase(commentRepo, diagramRepo);
const resolveComment = new ResolveCommentUseCase(commentRepo, diagramRepo);
const deleteComment = new DeleteCommentUseCase(commentRepo, diagramRepo);

// Realtime
const joinRoom = new JoinRoomUseCase(sessionRepo, diagramRepo, sceneRepo);
const joinRoomGuest = new JoinRoomGuestUseCase(shareRepo, diagramRepo, sceneRepo);
const saveScene = new SaveSceneUseCase(sceneRepo);

// Middleware
const requireAuth = createRequireAuth(getCurrentUser);

// ============================================================
// Express App
// ============================================================

export const app = express();

app.use(requestId);
app.use(requestLogger);
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", createAuthRoutes({ register, login, logout, getCurrentUser, updateProfile, changePassword }, requireAuth));
app.use("/api/diagrams", createDiagramRoutes({ create: createDiagram, get: getDiagram, list: listDiagrams, search: searchDiagrams, update: updateDiagram, updateThumbnail, delete: deleteDiagram, toggleStar, duplicate: duplicateDiagram, move: moveDiagram }, requireAuth));
app.use("/api/diagrams/:diagramId/scenes", createSceneRoutes({ list: listScenes, get: getScene, create: createScene, rename: renameScene, delete: deleteScene }, requireAuth));
app.use("/api/diagrams/:diagramId/comments", createCommentRoutes({ list: listComments, create: createComment, reply: replyComment, resolve: resolveComment, delete: deleteComment }, requireAuth));
app.use("/api/folders", createFolderRoutes({ create: createFolder, list: listFolders, rename: renameFolder, delete: deleteFolder }, requireAuth));
app.use("/api/share", createShareRoutes({ createLink, resolveLink, listLinks, deleteLink }, requireAuth));
app.use("/api/admin", createAdminRoutes({ listUsers, updateUser: adminUpdateUser, getSettings, updateSettings, getMetrics }, requireAuth));

// --- Honeybadger error handler (must be after all routes) ---
if (config.honeybadgerApiKey) {
  app.use(Honeybadger.errorHandler);
}

// ============================================================
// Start
// ============================================================

async function startServer(): Promise<void> {
  await initSchema();
  const httpServer = createServer(app);
  setupSocketServer(httpServer, { joinRoom, joinRoomGuest, saveScene, createComment, replyComment, resolveComment, deleteComment });

  httpServer.listen(config.port, () => {
    logger.info({ port: config.port }, `Backend running on http://localhost:${config.port}`);
  });
}

startServer().catch((error: unknown) => {
  logger.fatal(error, "Failed to start backend");
  process.exit(1);
});

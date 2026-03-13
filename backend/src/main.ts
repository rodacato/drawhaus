import Honeybadger from "@honeybadger-io/js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { authLimiter, generalLimiter } from "./infrastructure/http/middleware/rate-limit";
import { createSetupLock } from "./infrastructure/http/middleware/setup-lock";
import { config } from "./infrastructure/config";
import { initSchema, pool } from "./infrastructure/db";
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
import { PgTagRepository } from "./infrastructure/persistence/pg-tag-repository";
import { PgInvitationRepository } from "./infrastructure/persistence/pg-invitation-repository";
import { PgPasswordResetRepository } from "./infrastructure/persistence/pg-password-reset-repository";
import { PgOAuthTokenRepository } from "./infrastructure/persistence/pg-oauth-token-repository";
import { PgDriveBackupRepository } from "./infrastructure/persistence/pg-drive-backup-repository";
import { PgWorkspaceRepository } from "./infrastructure/persistence/pg-workspace-repository";

// --- Services ---
import { BcryptHasher } from "./infrastructure/services/bcrypt-hasher";
import { ResendEmailService } from "./infrastructure/services/email-service";
import { GoogleDriveServiceImpl } from "./infrastructure/services/google-drive-service";
import { GoogleTokenRefresher } from "./infrastructure/services/google-token-refresh";

// --- Use Cases: Auth ---
import { RegisterUseCase } from "./application/use-cases/auth/register";
import { LoginUseCase } from "./application/use-cases/auth/login";
import { LogoutUseCase } from "./application/use-cases/auth/logout";
import { GetCurrentUserUseCase } from "./application/use-cases/auth/get-current-user";
import { UpdateProfileUseCase } from "./application/use-cases/auth/update-profile";
import { ChangePasswordUseCase } from "./application/use-cases/auth/change-password";
import { AcceptInviteUseCase } from "./application/use-cases/auth/accept-invite";
import { ForgotPasswordUseCase } from "./application/use-cases/auth/forgot-password";
import { ResetPasswordUseCase } from "./application/use-cases/auth/reset-password";
import { DeleteAccountUseCase } from "./application/use-cases/auth/delete-account";
import { GoogleAuthUseCase } from "./application/use-cases/auth/google-auth";

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

// --- Use Cases: Workspaces ---
import { CreateWorkspaceUseCase } from "./application/use-cases/workspaces/create-workspace";
import { ListWorkspacesUseCase } from "./application/use-cases/workspaces/list-workspaces";
import { GetWorkspaceUseCase } from "./application/use-cases/workspaces/get-workspace";
import { UpdateWorkspaceUseCase } from "./application/use-cases/workspaces/update-workspace";
import { DeleteWorkspaceUseCase } from "./application/use-cases/workspaces/delete-workspace";
import { AddWorkspaceMemberUseCase, UpdateWorkspaceMemberRoleUseCase, RemoveWorkspaceMemberUseCase } from "./application/use-cases/workspaces/manage-members";
import { InviteToWorkspaceUseCase } from "./application/use-cases/workspaces/invite-to-workspace";
import { AcceptWorkspaceInviteUseCase } from "./application/use-cases/workspaces/accept-workspace-invite";
import { EnsurePersonalWorkspaceUseCase } from "./application/use-cases/workspaces/ensure-personal-workspace";

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
import { AdminDeleteUserUseCase } from "./application/use-cases/admin/delete-user";
import { GetSiteSettingsUseCase } from "./application/use-cases/admin/get-site-settings";
import { UpdateSiteSettingsUseCase } from "./application/use-cases/admin/update-site-settings";
import { GetMetricsUseCase } from "./application/use-cases/admin/get-metrics";
import { InviteUserUseCase } from "./application/use-cases/admin/invite-user";

// --- Use Cases: Scenes ---
import { ListScenesUseCase } from "./application/use-cases/scenes/list-scenes";
import { GetSceneUseCase } from "./application/use-cases/scenes/get-scene";
import { CreateSceneUseCase } from "./application/use-cases/scenes/create-scene";
import { RenameSceneUseCase } from "./application/use-cases/scenes/rename-scene";
import { DeleteSceneUseCase } from "./application/use-cases/scenes/delete-scene";

// --- Use Cases: Tags ---
import { CreateTagUseCase } from "./application/use-cases/tags/create-tag";
import { ListTagsUseCase } from "./application/use-cases/tags/list-tags";
import { DeleteTagUseCase } from "./application/use-cases/tags/delete-tag";
import { UpdateTagUseCase } from "./application/use-cases/tags/update-tag";
import { AssignTagUseCase } from "./application/use-cases/tags/assign-tag";
import { UnassignTagUseCase } from "./application/use-cases/tags/unassign-tag";

// --- Use Cases: Comments ---
import { ListCommentsUseCase } from "./application/use-cases/comments/list-comments";
import { CreateCommentUseCase } from "./application/use-cases/comments/create-comment";
import { ReplyCommentUseCase } from "./application/use-cases/comments/reply-comment";
import { ResolveCommentUseCase } from "./application/use-cases/comments/resolve-comment";
import { DeleteCommentUseCase } from "./application/use-cases/comments/delete-comment";
import { ToggleLikeUseCase } from "./application/use-cases/comments/toggle-like";

// --- Use Cases: Realtime ---
import { JoinRoomUseCase } from "./application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "./application/use-cases/realtime/join-room-guest";
import { SaveSceneUseCase } from "./application/use-cases/realtime/save-scene";

// --- Use Cases: Drive ---
import { SyncToDriveUseCase } from "./application/use-cases/drive/sync-to-drive";
import { ExportToDriveUseCase } from "./application/use-cases/drive/export-to-drive";
import { GetDriveStatusUseCase } from "./application/use-cases/drive/get-drive-status";
import { ToggleDriveBackupUseCase } from "./application/use-cases/drive/toggle-drive-backup";
import { DisconnectDriveUseCase } from "./application/use-cases/drive/disconnect-drive";
import { ListDriveFilesUseCase } from "./application/use-cases/drive/list-drive-files";
import { ImportFromDriveUseCase } from "./application/use-cases/drive/import-from-drive";

// --- HTTP Routes ---
import { createAuthRoutes } from "./infrastructure/http/routes/auth.routes";
import { createDiagramRoutes } from "./infrastructure/http/routes/diagram.routes";
import { createFolderRoutes } from "./infrastructure/http/routes/folder.routes";
import { createShareRoutes } from "./infrastructure/http/routes/share.routes";
import { createAdminRoutes } from "./infrastructure/http/routes/admin.routes";
import { createSceneRoutes } from "./infrastructure/http/routes/scene.routes";
import { createCommentRoutes } from "./infrastructure/http/routes/comment.routes";
import { createTagRoutes } from "./infrastructure/http/routes/tag.routes";
import { createDriveRoutes } from "./infrastructure/http/routes/drive.routes";
import { createWorkspaceRoutes } from "./infrastructure/http/routes/workspace.routes";
import { createSetupRoutes } from "./infrastructure/http/routes/setup.routes";
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
const tagRepo = new PgTagRepository();
const invitationRepo = new PgInvitationRepository();
const passwordResetRepo = new PgPasswordResetRepository();
const oauthTokenRepo = new PgOAuthTokenRepository();
const driveBackupRepo = new PgDriveBackupRepository();
const workspaceRepo = new PgWorkspaceRepository();
const hasher = new BcryptHasher();

// Integration secrets (optional — requires ENCRYPTION_KEY)
import { PgIntegrationSecretsRepository } from "./infrastructure/persistence/pg-integration-secrets-repository";
import { ConfigProvider } from "./infrastructure/services/config-provider";

const integrationSecretsRepo = config.encryptionKey
  ? new PgIntegrationSecretsRepository(config.encryptionKey)
  : null;
const configProvider = new ConfigProvider(integrationSecretsRepo);
const emailService = new ResendEmailService(configProvider);
const driveService = new GoogleDriveServiceImpl();
const tokenRefresher = new GoogleTokenRefresher(oauthTokenRepo);

// Auth
const register = new RegisterUseCase(userRepo, sessionRepo, hasher, siteSettingsRepo);
const login = new LoginUseCase(userRepo, sessionRepo, hasher);
const logout = new LogoutUseCase(sessionRepo);
const getCurrentUser = new GetCurrentUserUseCase(sessionRepo);
const updateProfile = new UpdateProfileUseCase(userRepo);
const changePassword = new ChangePasswordUseCase(userRepo, hasher);
const acceptInvite = new AcceptInviteUseCase(userRepo, sessionRepo, invitationRepo, hasher);
const forgotPassword = new ForgotPasswordUseCase(userRepo, passwordResetRepo, emailService);
const resetPassword = new ResetPasswordUseCase(userRepo, sessionRepo, passwordResetRepo, hasher);
const deleteAccount = new DeleteAccountUseCase(userRepo, hasher);
const googleAuth = new GoogleAuthUseCase(userRepo, sessionRepo, oauthTokenRepo, siteSettingsRepo);

// Diagrams
const createDiagram = new CreateDiagramUseCase(diagramRepo);
const getDiagram = new GetDiagramUseCase(diagramRepo);
const listDiagrams = new ListDiagramsUseCase(diagramRepo);
const searchDiagrams = new SearchDiagramsUseCase(diagramRepo);
const updateDiagram = new UpdateDiagramUseCase(diagramRepo);
const deleteDiagram = new DeleteDiagramUseCase(diagramRepo, workspaceRepo);
const updateThumbnail = new UpdateThumbnailUseCase(diagramRepo);
const toggleStar = new ToggleStarUseCase(diagramRepo);
const duplicateDiagram = new DuplicateDiagramUseCase(diagramRepo);

// Workspaces
const createWorkspace = new CreateWorkspaceUseCase(workspaceRepo, siteSettingsRepo);
const listWorkspaces = new ListWorkspacesUseCase(workspaceRepo);
const getWorkspace = new GetWorkspaceUseCase(workspaceRepo);
const updateWorkspace = new UpdateWorkspaceUseCase(workspaceRepo);
const deleteWorkspace = new DeleteWorkspaceUseCase(workspaceRepo);
const addWorkspaceMember = new AddWorkspaceMemberUseCase(workspaceRepo, siteSettingsRepo);
const updateWorkspaceMemberRole = new UpdateWorkspaceMemberRoleUseCase(workspaceRepo);
const removeWorkspaceMember = new RemoveWorkspaceMemberUseCase(workspaceRepo);
const inviteToWorkspace = new InviteToWorkspaceUseCase(workspaceRepo, siteSettingsRepo, emailService);
const acceptWorkspaceInvite = new AcceptWorkspaceInviteUseCase(workspaceRepo);
const ensurePersonalWorkspace = new EnsurePersonalWorkspaceUseCase(workspaceRepo);

// Folders
const createFolder = new CreateFolderUseCase(folderRepo, workspaceRepo);
const listFolders = new ListFoldersUseCase(folderRepo, workspaceRepo);
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
const adminDeleteUser = new AdminDeleteUserUseCase(userRepo, sessionRepo);
const getSettings = new GetSiteSettingsUseCase(siteSettingsRepo);
const updateSettings = new UpdateSiteSettingsUseCase(siteSettingsRepo);
const getMetrics = new GetMetricsUseCase();
const inviteUser = new InviteUserUseCase(userRepo, invitationRepo, siteSettingsRepo, emailService);

// Scenes
const listScenes = new ListScenesUseCase(sceneRepo, diagramRepo);
const getScene = new GetSceneUseCase(sceneRepo, diagramRepo);
const createScene = new CreateSceneUseCase(sceneRepo, diagramRepo);
const renameScene = new RenameSceneUseCase(sceneRepo, diagramRepo);
const deleteScene = new DeleteSceneUseCase(sceneRepo, diagramRepo);

// Tags
const createTag = new CreateTagUseCase(tagRepo);
const listTags = new ListTagsUseCase(tagRepo);
const deleteTag = new DeleteTagUseCase(tagRepo);
const updateTag = new UpdateTagUseCase(tagRepo);
const assignTag = new AssignTagUseCase(tagRepo, diagramRepo);
const unassignTag = new UnassignTagUseCase(tagRepo, diagramRepo);

// Comments
const listComments = new ListCommentsUseCase(commentRepo, diagramRepo);
const createComment = new CreateCommentUseCase(commentRepo, diagramRepo);
const replyComment = new ReplyCommentUseCase(commentRepo, diagramRepo);
const resolveComment = new ResolveCommentUseCase(commentRepo, diagramRepo);
const deleteComment = new DeleteCommentUseCase(commentRepo, diagramRepo);
const toggleLike = new ToggleLikeUseCase(commentRepo, diagramRepo);

// Realtime
const joinRoom = new JoinRoomUseCase(sessionRepo, diagramRepo, sceneRepo);
const joinRoomGuest = new JoinRoomGuestUseCase(shareRepo, diagramRepo, sceneRepo);
const saveScene = new SaveSceneUseCase(sceneRepo);

// Drive
const syncToDrive = new SyncToDriveUseCase(driveService, driveBackupRepo, tokenRefresher, diagramRepo, folderRepo);
const exportToDrive = new ExportToDriveUseCase(driveService, tokenRefresher);
const getDriveStatus = new GetDriveStatusUseCase(oauthTokenRepo, driveBackupRepo);
const toggleDriveBackup = new ToggleDriveBackupUseCase(driveBackupRepo, oauthTokenRepo);
const disconnectDrive = new DisconnectDriveUseCase(driveBackupRepo);
const listDriveFiles = new ListDriveFilesUseCase(driveService, driveBackupRepo, tokenRefresher);
const importFromDrive = new ImportFromDriveUseCase(driveService, diagramRepo, tokenRefresher);

// Middleware
const requireAuth = createRequireAuth(getCurrentUser);

// ============================================================
// Express App
// ============================================================

export const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(requestId);
app.use(requestLogger);
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", async (_req, res) => {
  let database = "ok";
  try {
    await pool.query("SELECT 1");
  } catch {
    database = "error";
  }
  const status = database === "ok" ? "ok" : "degraded";
  res.status(status === "ok" ? 200 : 503).json({
    status,
    version: config.appVersion,
    uptime: Math.floor(process.uptime()),
    database,
  });
});

app.get("/api/version", (_req, res) => {
  res.json({
    version: config.appVersion,
    commit: config.gitCommit,
    deployedAt: config.deployedAt,
  });
});

app.get("/api/site/status", async (_req, res) => {
  const settings = await getSettings.execute();
  res.json({ maintenanceMode: settings.maintenanceMode, instanceName: settings.instanceName });
});

// Setup lock (blocks all routes except whitelisted until setup is complete)
const setupLock = createSetupLock(siteSettingsRepo);
app.use(setupLock.middleware);

// Rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api", generalLimiter);

app.use("/api/setup", createSetupRoutes({ getSettings, updateSettings }, userRepo, requireAuth, setupLock.invalidate));
app.use("/api/auth", createAuthRoutes({ register, login, logout, getCurrentUser, updateProfile, changePassword, acceptInvite, forgotPassword, resetPassword, deleteAccount, googleAuth }, requireAuth));
app.use("/api/diagrams", createDiagramRoutes({ create: createDiagram, get: getDiagram, list: listDiagrams, search: searchDiagrams, update: updateDiagram, updateThumbnail, delete: deleteDiagram, toggleStar, duplicate: duplicateDiagram, move: moveDiagram }, requireAuth, tagRepo));
app.use("/api/diagrams/:diagramId/scenes", createSceneRoutes({ list: listScenes, get: getScene, create: createScene, rename: renameScene, delete: deleteScene }, requireAuth));
app.use("/api/diagrams/:diagramId/comments", createCommentRoutes({ list: listComments, create: createComment, reply: replyComment, resolve: resolveComment, delete: deleteComment, toggleLike }, requireAuth));
app.use("/api/tags", createTagRoutes({ create: createTag, list: listTags, delete: deleteTag, update: updateTag, assign: assignTag, unassign: unassignTag }, requireAuth));
app.use("/api/folders", createFolderRoutes({ create: createFolder, list: listFolders, rename: renameFolder, delete: deleteFolder }, requireAuth));
app.use("/api/workspaces", createWorkspaceRoutes({ create: createWorkspace, list: listWorkspaces, get: getWorkspace, update: updateWorkspace, delete: deleteWorkspace, addMember: addWorkspaceMember, updateMemberRole: updateWorkspaceMemberRole, removeMember: removeWorkspaceMember, invite: inviteToWorkspace, acceptInvite: acceptWorkspaceInvite, ensurePersonal: ensurePersonalWorkspace }, requireAuth));
app.use("/api/share", createShareRoutes({ createLink, resolveLink, listLinks, deleteLink }, requireAuth));
app.use("/api/admin", createAdminRoutes(
  { listUsers, updateUser: adminUpdateUser, deleteUser: adminDeleteUser, getSettings, updateSettings, getMetrics, inviteUser },
  requireAuth,
  invitationRepo,
  integrationSecretsRepo ? { repo: integrationSecretsRepo, configProvider } : undefined,
));
app.use("/api/drive", createDriveRoutes({ getDriveStatus, toggleDriveBackup, disconnectDrive, exportToDrive, listDriveFiles, importFromDrive }, tokenRefresher, requireAuth));

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
  await setupSocketServer(httpServer, { joinRoom, joinRoomGuest, saveScene, syncToDrive, createComment, replyComment, resolveComment, deleteComment });

  // Start backup scheduler (cron-based, no-op if disabled)
  const { startBackupScheduler } = await import("./infrastructure/services/backup-scheduler");
  startBackupScheduler();

  httpServer.listen(config.port, () => {
    logger.info({ port: config.port }, `Backend running on http://localhost:${config.port}`);
  });
}

startServer().catch((error: unknown) => {
  logger.fatal(error, "Failed to start backend");
  process.exit(1);
});

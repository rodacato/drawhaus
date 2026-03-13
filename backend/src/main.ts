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

import { createCompositionRoot } from "./composition";

const { repos, services, useCases } = createCompositionRoot();

// Middleware
const requireAuth = createRequireAuth(useCases.getCurrentUser);

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
  const settings = await useCases.getSettings.execute();
  res.json({ maintenanceMode: settings.maintenanceMode, instanceName: settings.instanceName });
});

// Setup lock (blocks all routes except whitelisted until setup is complete)
const setupLock = createSetupLock(repos.siteSettingsRepo);
app.use(setupLock.middleware);

// Rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api", generalLimiter);

app.use("/api/setup", createSetupRoutes({ getSettings: useCases.getSettings, updateSettings: useCases.updateSettings }, repos.userRepo, requireAuth, setupLock.invalidate));
app.use("/api/auth", createAuthRoutes({ register: useCases.register, login: useCases.login, logout: useCases.logout, getCurrentUser: useCases.getCurrentUser, updateProfile: useCases.updateProfile, changePassword: useCases.changePassword, acceptInvite: useCases.acceptInvite, forgotPassword: useCases.forgotPassword, resetPassword: useCases.resetPassword, deleteAccount: useCases.deleteAccount, googleAuth: useCases.googleAuth }, requireAuth));
app.use("/api/diagrams", createDiagramRoutes({ create: useCases.createDiagram, get: useCases.getDiagram, list: useCases.listDiagrams, search: useCases.searchDiagrams, update: useCases.updateDiagram, updateThumbnail: useCases.updateThumbnail, delete: useCases.deleteDiagram, toggleStar: useCases.toggleStar, duplicate: useCases.duplicateDiagram, move: useCases.moveDiagram }, requireAuth, repos.tagRepo));
app.use("/api/diagrams/:diagramId/scenes", createSceneRoutes({ list: useCases.listScenes, get: useCases.getScene, create: useCases.createScene, rename: useCases.renameScene, delete: useCases.deleteScene }, requireAuth));
app.use("/api/diagrams/:diagramId/comments", createCommentRoutes({ list: useCases.listComments, create: useCases.createComment, reply: useCases.replyComment, resolve: useCases.resolveComment, delete: useCases.deleteComment, toggleLike: useCases.toggleLike }, requireAuth));
app.use("/api/tags", createTagRoutes({ create: useCases.createTag, list: useCases.listTags, delete: useCases.deleteTag, update: useCases.updateTag, assign: useCases.assignTag, unassign: useCases.unassignTag }, requireAuth));
app.use("/api/folders", createFolderRoutes({ create: useCases.createFolder, list: useCases.listFolders, rename: useCases.renameFolder, delete: useCases.deleteFolder }, requireAuth));
app.use("/api/workspaces", createWorkspaceRoutes({ create: useCases.createWorkspace, list: useCases.listWorkspaces, get: useCases.getWorkspace, update: useCases.updateWorkspace, delete: useCases.deleteWorkspace, addMember: useCases.addWorkspaceMember, updateMemberRole: useCases.updateWorkspaceMemberRole, removeMember: useCases.removeWorkspaceMember, invite: useCases.inviteToWorkspace, acceptInvite: useCases.acceptWorkspaceInvite, ensurePersonal: useCases.ensurePersonalWorkspace }, requireAuth));
app.use("/api/share", createShareRoutes({ createLink: useCases.createLink, resolveLink: useCases.resolveLink, listLinks: useCases.listLinks, deleteLink: useCases.deleteLink }, requireAuth));
app.use("/api/admin", createAdminRoutes(
  { listUsers: useCases.listUsers, updateUser: useCases.adminUpdateUser, deleteUser: useCases.adminDeleteUser, getSettings: useCases.getSettings, updateSettings: useCases.updateSettings, getMetrics: useCases.getMetrics, inviteUser: useCases.inviteUser },
  requireAuth,
  repos.invitationRepo,
  repos.integrationSecretsRepo ? { repo: repos.integrationSecretsRepo, configProvider: services.configProvider } : undefined,
));
app.use("/api/drive", createDriveRoutes({ getDriveStatus: useCases.getDriveStatus, toggleDriveBackup: useCases.toggleDriveBackup, disconnectDrive: useCases.disconnectDrive, exportToDrive: useCases.exportToDrive, listDriveFiles: useCases.listDriveFiles, importFromDrive: useCases.importFromDrive }, services.tokenRefresher, requireAuth));

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
  await setupSocketServer(httpServer, { joinRoom: useCases.joinRoom, joinRoomGuest: useCases.joinRoomGuest, saveScene: useCases.saveScene, syncToDrive: useCases.syncToDrive, createComment: useCases.createComment, replyComment: useCases.replyComment, resolveComment: useCases.resolveComment, deleteComment: useCases.deleteComment });

  // Start backup scheduler (cron-based, reads config from DB, no-op if disabled)
  const { startBackupScheduler } = await import("./infrastructure/services/backup-scheduler");
  await startBackupScheduler();

  httpServer.listen(config.port, () => {
    logger.info({ port: config.port }, `Backend running on http://localhost:${config.port}`);
  });
}

startServer().catch((error: unknown) => {
  logger.fatal(error, "Failed to start backend");
  process.exit(1);
});

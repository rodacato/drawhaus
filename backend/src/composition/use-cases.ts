// --- Auth ---
import { RegisterUseCase } from "../application/use-cases/auth/register";
import { LoginUseCase } from "../application/use-cases/auth/login";
import { LogoutUseCase } from "../application/use-cases/auth/logout";
import { GetCurrentUserUseCase } from "../application/use-cases/auth/get-current-user";
import { UpdateProfileUseCase } from "../application/use-cases/auth/update-profile";
import { ChangePasswordUseCase } from "../application/use-cases/auth/change-password";
import { AcceptInviteUseCase } from "../application/use-cases/auth/accept-invite";
import { ForgotPasswordUseCase } from "../application/use-cases/auth/forgot-password";
import { ResetPasswordUseCase } from "../application/use-cases/auth/reset-password";
import { DeleteAccountUseCase } from "../application/use-cases/auth/delete-account";
import { GoogleAuthUseCase } from "../application/use-cases/auth/google-auth";

// --- Diagrams ---
import { CreateDiagramUseCase } from "../application/use-cases/diagrams/create-diagram";
import { GetDiagramUseCase } from "../application/use-cases/diagrams/get-diagram";
import { ListDiagramsUseCase } from "../application/use-cases/diagrams/list-diagrams";
import { SearchDiagramsUseCase } from "../application/use-cases/diagrams/search-diagrams";
import { UpdateDiagramUseCase } from "../application/use-cases/diagrams/update-diagram";
import { DeleteDiagramUseCase } from "../application/use-cases/diagrams/delete-diagram";
import { UpdateThumbnailUseCase } from "../application/use-cases/diagrams/update-thumbnail";
import { ToggleStarUseCase } from "../application/use-cases/diagrams/toggle-star";
import { DuplicateDiagramUseCase } from "../application/use-cases/diagrams/duplicate-diagram";

// --- Workspaces ---
import { CreateWorkspaceUseCase } from "../application/use-cases/workspaces/create-workspace";
import { ListWorkspacesUseCase } from "../application/use-cases/workspaces/list-workspaces";
import { GetWorkspaceUseCase } from "../application/use-cases/workspaces/get-workspace";
import { UpdateWorkspaceUseCase } from "../application/use-cases/workspaces/update-workspace";
import { DeleteWorkspaceUseCase } from "../application/use-cases/workspaces/delete-workspace";
import { AddWorkspaceMemberUseCase, UpdateWorkspaceMemberRoleUseCase, RemoveWorkspaceMemberUseCase } from "../application/use-cases/workspaces/manage-members";
import { InviteToWorkspaceUseCase } from "../application/use-cases/workspaces/invite-to-workspace";
import { AcceptWorkspaceInviteUseCase } from "../application/use-cases/workspaces/accept-workspace-invite";
import { EnsurePersonalWorkspaceUseCase } from "../application/use-cases/workspaces/ensure-personal-workspace";

// --- Folders ---
import { CreateFolderUseCase } from "../application/use-cases/folders/create-folder";
import { ListFoldersUseCase } from "../application/use-cases/folders/list-folders";
import { RenameFolderUseCase } from "../application/use-cases/folders/rename-folder";
import { DeleteFolderUseCase } from "../application/use-cases/folders/delete-folder";
import { MoveDiagramUseCase } from "../application/use-cases/folders/move-diagram";

// --- Share ---
import { CreateShareLinkUseCase } from "../application/use-cases/share/create-link";
import { ResolveLinkUseCase } from "../application/use-cases/share/resolve-link";
import { ListLinksUseCase } from "../application/use-cases/share/list-links";
import { DeleteLinkUseCase } from "../application/use-cases/share/delete-link";

// --- Admin ---
import { ListUsersUseCase } from "../application/use-cases/admin/list-users";
import { AdminUpdateUserUseCase } from "../application/use-cases/admin/update-user";
import { AdminDeleteUserUseCase } from "../application/use-cases/admin/delete-user";
import { GetSiteSettingsUseCase } from "../application/use-cases/admin/get-site-settings";
import { UpdateSiteSettingsUseCase } from "../application/use-cases/admin/update-site-settings";
import { GetMetricsUseCase } from "../application/use-cases/admin/get-metrics";
import { InviteUserUseCase } from "../application/use-cases/admin/invite-user";

// --- Scenes ---
import { ListScenesUseCase } from "../application/use-cases/scenes/list-scenes";
import { GetSceneUseCase } from "../application/use-cases/scenes/get-scene";
import { CreateSceneUseCase } from "../application/use-cases/scenes/create-scene";
import { RenameSceneUseCase } from "../application/use-cases/scenes/rename-scene";
import { DeleteSceneUseCase } from "../application/use-cases/scenes/delete-scene";

// --- Tags ---
import { CreateTagUseCase } from "../application/use-cases/tags/create-tag";
import { ListTagsUseCase } from "../application/use-cases/tags/list-tags";
import { DeleteTagUseCase } from "../application/use-cases/tags/delete-tag";
import { UpdateTagUseCase } from "../application/use-cases/tags/update-tag";
import { AssignTagUseCase } from "../application/use-cases/tags/assign-tag";
import { UnassignTagUseCase } from "../application/use-cases/tags/unassign-tag";

// --- Comments ---
import { ListCommentsUseCase } from "../application/use-cases/comments/list-comments";
import { CreateCommentUseCase } from "../application/use-cases/comments/create-comment";
import { ReplyCommentUseCase } from "../application/use-cases/comments/reply-comment";
import { ResolveCommentUseCase } from "../application/use-cases/comments/resolve-comment";
import { DeleteCommentUseCase } from "../application/use-cases/comments/delete-comment";
import { ToggleLikeUseCase } from "../application/use-cases/comments/toggle-like";

// --- Realtime ---
import { JoinRoomUseCase } from "../application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "../application/use-cases/realtime/join-room-guest";
import { SaveSceneUseCase } from "../application/use-cases/realtime/save-scene";

// --- Drive ---
import { SyncToDriveUseCase } from "../application/use-cases/drive/sync-to-drive";
import { ExportToDriveUseCase } from "../application/use-cases/drive/export-to-drive";
import { GetDriveStatusUseCase } from "../application/use-cases/drive/get-drive-status";
import { ToggleDriveBackupUseCase } from "../application/use-cases/drive/toggle-drive-backup";
import { DisconnectDriveUseCase } from "../application/use-cases/drive/disconnect-drive";
import { ListDriveFilesUseCase } from "../application/use-cases/drive/list-drive-files";
import { ImportFromDriveUseCase } from "../application/use-cases/drive/import-from-drive";

// --- Templates ---
import { CreateTemplateUseCase } from "../application/use-cases/templates/create-template";
import { GetTemplateUseCase } from "../application/use-cases/templates/get-template";
import { ListTemplatesUseCase } from "../application/use-cases/templates/list-templates";
import { UpdateTemplateUseCase } from "../application/use-cases/templates/update-template";
import { DeleteTemplateUseCase } from "../application/use-cases/templates/delete-template";
import { UseTemplateUseCase } from "../application/use-cases/templates/use-template";

// --- Ownership Transfer ---
import { TransferWorkspaceOwnershipUseCase } from "../application/use-cases/workspaces/transfer-ownership";
import { TransferDiagramOwnershipUseCase } from "../application/use-cases/diagrams/transfer-ownership";
import { TransferTemplateOwnershipUseCase } from "../application/use-cases/templates/transfer-ownership";

import type { Repositories } from "./repositories";
import type { Services } from "./services";

export function createUseCases(repos: Repositories, services: Services) {
  // Auth
  const register = new RegisterUseCase(repos.userRepo, repos.sessionRepo, services.hasher, repos.siteSettingsRepo);
  const login = new LoginUseCase(repos.userRepo, repos.sessionRepo, services.hasher, services.auditLogger);
  const logout = new LogoutUseCase(repos.sessionRepo);
  const getCurrentUser = new GetCurrentUserUseCase(repos.sessionRepo);
  const updateProfile = new UpdateProfileUseCase(repos.userRepo);
  const changePassword = new ChangePasswordUseCase(repos.userRepo, services.hasher);
  const acceptInvite = new AcceptInviteUseCase(repos.userRepo, repos.sessionRepo, repos.invitationRepo, services.hasher);
  const forgotPassword = new ForgotPasswordUseCase(repos.userRepo, repos.passwordResetRepo, services.emailService);
  const resetPassword = new ResetPasswordUseCase(repos.userRepo, repos.sessionRepo, repos.passwordResetRepo, services.hasher);
  const deleteAccount = new DeleteAccountUseCase(repos.userRepo, services.hasher, services.auditLogger, repos.workspaceRepo);
  const googleAuth = new GoogleAuthUseCase(repos.userRepo, repos.sessionRepo, repos.oauthTokenRepo, repos.siteSettingsRepo);

  // Diagrams
  const createDiagram = new CreateDiagramUseCase(repos.diagramRepo);
  const getDiagram = new GetDiagramUseCase(repos.diagramRepo, repos.sceneRepo);
  const listDiagrams = new ListDiagramsUseCase(repos.diagramRepo);
  const searchDiagrams = new SearchDiagramsUseCase(repos.diagramRepo);
  const updateDiagram = new UpdateDiagramUseCase(repos.diagramRepo);
  const deleteDiagram = new DeleteDiagramUseCase(repos.diagramRepo, repos.workspaceRepo);
  const updateThumbnail = new UpdateThumbnailUseCase(repos.diagramRepo);
  const toggleStar = new ToggleStarUseCase(repos.diagramRepo);
  const duplicateDiagram = new DuplicateDiagramUseCase(repos.diagramRepo);

  // Workspaces
  const createWorkspace = new CreateWorkspaceUseCase(repos.workspaceRepo, repos.siteSettingsRepo);
  const listWorkspaces = new ListWorkspacesUseCase(repos.workspaceRepo);
  const getWorkspace = new GetWorkspaceUseCase(repos.workspaceRepo);
  const updateWorkspace = new UpdateWorkspaceUseCase(repos.workspaceRepo);
  const deleteWorkspace = new DeleteWorkspaceUseCase(repos.workspaceRepo);
  const addWorkspaceMember = new AddWorkspaceMemberUseCase(repos.workspaceRepo, repos.siteSettingsRepo, services.auditLogger);
  const updateWorkspaceMemberRole = new UpdateWorkspaceMemberRoleUseCase(repos.workspaceRepo);
  const removeWorkspaceMember = new RemoveWorkspaceMemberUseCase(repos.workspaceRepo);
  const inviteToWorkspace = new InviteToWorkspaceUseCase(repos.workspaceRepo, repos.siteSettingsRepo, services.emailService);
  const acceptWorkspaceInvite = new AcceptWorkspaceInviteUseCase(repos.workspaceRepo);
  const ensurePersonalWorkspace = new EnsurePersonalWorkspaceUseCase(repos.workspaceRepo);

  // Folders
  const createFolder = new CreateFolderUseCase(repos.folderRepo, repos.workspaceRepo);
  const listFolders = new ListFoldersUseCase(repos.folderRepo, repos.workspaceRepo);
  const renameFolder = new RenameFolderUseCase(repos.folderRepo);
  const deleteFolder = new DeleteFolderUseCase(repos.folderRepo);
  const moveDiagram = new MoveDiagramUseCase(repos.diagramRepo, repos.folderRepo, repos.workspaceRepo);

  // Share
  const createLink = new CreateShareLinkUseCase(repos.shareRepo, repos.diagramRepo);
  const resolveLink = new ResolveLinkUseCase(repos.shareRepo, repos.diagramRepo);
  const listLinks = new ListLinksUseCase(repos.shareRepo, repos.diagramRepo);
  const deleteLink = new DeleteLinkUseCase(repos.shareRepo);

  // Admin
  const listUsers = new ListUsersUseCase(repos.userRepo);
  const adminUpdateUser = new AdminUpdateUserUseCase(repos.userRepo, repos.sessionRepo, services.auditLogger);
  const adminDeleteUser = new AdminDeleteUserUseCase(repos.userRepo, repos.sessionRepo, services.auditLogger);
  const getSettings = new GetSiteSettingsUseCase(repos.siteSettingsRepo);
  const updateSettings = new UpdateSiteSettingsUseCase(repos.siteSettingsRepo);
  const getMetrics = new GetMetricsUseCase();
  const inviteUser = new InviteUserUseCase(repos.userRepo, repos.invitationRepo, repos.siteSettingsRepo, services.emailService);

  // Scenes
  const listScenes = new ListScenesUseCase(repos.sceneRepo, repos.diagramRepo);
  const getScene = new GetSceneUseCase(repos.sceneRepo, repos.diagramRepo);
  const createScene = new CreateSceneUseCase(repos.sceneRepo, repos.diagramRepo);
  const renameScene = new RenameSceneUseCase(repos.sceneRepo, repos.diagramRepo);
  const deleteScene = new DeleteSceneUseCase(repos.sceneRepo, repos.diagramRepo);

  // Tags
  const createTag = new CreateTagUseCase(repos.tagRepo);
  const listTags = new ListTagsUseCase(repos.tagRepo);
  const deleteTag = new DeleteTagUseCase(repos.tagRepo);
  const updateTag = new UpdateTagUseCase(repos.tagRepo);
  const assignTag = new AssignTagUseCase(repos.tagRepo, repos.diagramRepo);
  const unassignTag = new UnassignTagUseCase(repos.tagRepo, repos.diagramRepo);

  // Comments
  const listComments = new ListCommentsUseCase(repos.commentRepo, repos.diagramRepo);
  const createComment = new CreateCommentUseCase(repos.commentRepo, repos.diagramRepo);
  const replyComment = new ReplyCommentUseCase(repos.commentRepo, repos.diagramRepo);
  const resolveComment = new ResolveCommentUseCase(repos.commentRepo, repos.diagramRepo);
  const deleteComment = new DeleteCommentUseCase(repos.commentRepo, repos.diagramRepo);
  const toggleLike = new ToggleLikeUseCase(repos.commentRepo, repos.diagramRepo);

  // Realtime
  const joinRoom = new JoinRoomUseCase(repos.sessionRepo, repos.diagramRepo, repos.sceneRepo);
  const joinRoomGuest = new JoinRoomGuestUseCase(repos.shareRepo, repos.diagramRepo, repos.sceneRepo);
  const saveScene = new SaveSceneUseCase(repos.sceneRepo);

  // Drive
  const syncToDrive = new SyncToDriveUseCase(services.driveService, repos.driveBackupRepo, services.tokenRefresher, repos.diagramRepo, repos.folderRepo);
  const exportToDrive = new ExportToDriveUseCase(services.driveService, services.tokenRefresher);
  const getDriveStatus = new GetDriveStatusUseCase(repos.oauthTokenRepo, repos.driveBackupRepo);
  const toggleDriveBackup = new ToggleDriveBackupUseCase(repos.driveBackupRepo, repos.oauthTokenRepo);
  const disconnectDrive = new DisconnectDriveUseCase(repos.driveBackupRepo);
  const listDriveFiles = new ListDriveFilesUseCase(services.driveService, repos.driveBackupRepo, services.tokenRefresher);
  const importFromDrive = new ImportFromDriveUseCase(services.driveService, repos.diagramRepo, services.tokenRefresher);

  // Templates
  const createTemplate = new CreateTemplateUseCase(repos.templateRepo);
  const getTemplate = new GetTemplateUseCase(repos.templateRepo);
  const listTemplates = new ListTemplatesUseCase(repos.templateRepo);
  const updateTemplate = new UpdateTemplateUseCase(repos.templateRepo);
  const deleteTemplate = new DeleteTemplateUseCase(repos.templateRepo);
  const useTemplate = new UseTemplateUseCase(repos.templateRepo, repos.diagramRepo);

  // Ownership Transfer
  const transferWorkspaceOwnership = new TransferWorkspaceOwnershipUseCase(repos.workspaceRepo, repos.diagramRepo, repos.templateRepo, services.auditLogger);
  const transferDiagramOwnership = new TransferDiagramOwnershipUseCase(repos.diagramRepo, repos.workspaceRepo, services.auditLogger);
  const transferTemplateOwnership = new TransferTemplateOwnershipUseCase(repos.templateRepo, repos.workspaceRepo, services.auditLogger);

  return {
    // auth
    register, login, logout, getCurrentUser, updateProfile, changePassword,
    acceptInvite, forgotPassword, resetPassword, deleteAccount, googleAuth,
    // diagrams
    createDiagram, getDiagram, listDiagrams, searchDiagrams, updateDiagram,
    deleteDiagram, updateThumbnail, toggleStar, duplicateDiagram,
    // workspaces
    createWorkspace, listWorkspaces, getWorkspace, updateWorkspace, deleteWorkspace,
    addWorkspaceMember, updateWorkspaceMemberRole, removeWorkspaceMember,
    inviteToWorkspace, acceptWorkspaceInvite, ensurePersonalWorkspace,
    // folders
    createFolder, listFolders, renameFolder, deleteFolder, moveDiagram,
    // share
    createLink, resolveLink, listLinks, deleteLink,
    // admin
    listUsers, adminUpdateUser, adminDeleteUser, getSettings, updateSettings, getMetrics, inviteUser,
    // scenes
    listScenes, getScene, createScene, renameScene, deleteScene,
    // tags
    createTag, listTags, deleteTag, updateTag, assignTag, unassignTag,
    // comments
    listComments, createComment, replyComment, resolveComment, deleteComment, toggleLike,
    // realtime
    joinRoom, joinRoomGuest, saveScene,
    // drive
    syncToDrive, exportToDrive, getDriveStatus, toggleDriveBackup, disconnectDrive, listDriveFiles, importFromDrive,
    // templates
    createTemplate, getTemplate, listTemplates, updateTemplate, deleteTemplate, useTemplate,
    // ownership transfer
    transferWorkspaceOwnership, transferDiagramOwnership, transferTemplateOwnership,
  };
}

export type UseCases = ReturnType<typeof createUseCases>;

import { PgUserRepository } from "../infrastructure/persistence/pg-user-repository";
import { PgSessionRepository } from "../infrastructure/persistence/pg-session-repository";
import { PgDiagramRepository } from "../infrastructure/persistence/pg-diagram-repository";
import { PgShareRepository } from "../infrastructure/persistence/pg-share-repository";
import { PgSiteSettingsRepository } from "../infrastructure/persistence/pg-site-settings-repository";
import { PgFolderRepository } from "../infrastructure/persistence/pg-folder-repository";
import { PgSceneRepository } from "../infrastructure/persistence/pg-scene-repository";
import { PgCommentRepository } from "../infrastructure/persistence/pg-comment-repository";
import { PgTagRepository } from "../infrastructure/persistence/pg-tag-repository";
import { PgInvitationRepository } from "../infrastructure/persistence/pg-invitation-repository";
import { PgPasswordResetRepository } from "../infrastructure/persistence/pg-password-reset-repository";
import { PgOAuthTokenRepository } from "../infrastructure/persistence/pg-oauth-token-repository";
import { PgDriveBackupRepository } from "../infrastructure/persistence/pg-drive-backup-repository";
import { PgWorkspaceRepository } from "../infrastructure/persistence/pg-workspace-repository";
import { PgIntegrationSecretsRepository } from "../infrastructure/persistence/pg-integration-secrets-repository";
import { PgTemplateRepository } from "../infrastructure/persistence/pg-template-repository";
import { PgSnapshotRepository } from "../infrastructure/persistence/pg-snapshot-repository";
import { PgApiKeyRepository } from "../infrastructure/persistence/pg-api-key-repository";
import { config } from "../infrastructure/config";

export function createRepositories() {
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
  const integrationSecretsRepo = config.encryptionKey
    ? new PgIntegrationSecretsRepository(config.encryptionKey)
    : null;
  const templateRepo = new PgTemplateRepository();
  const snapshotRepo = new PgSnapshotRepository();
  const apiKeyRepo = new PgApiKeyRepository();

  return {
    userRepo, sessionRepo, diagramRepo, shareRepo, siteSettingsRepo,
    folderRepo, sceneRepo, commentRepo, tagRepo, invitationRepo,
    passwordResetRepo, oauthTokenRepo, driveBackupRepo, workspaceRepo,
    integrationSecretsRepo, templateRepo, snapshotRepo, apiKeyRepo,
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

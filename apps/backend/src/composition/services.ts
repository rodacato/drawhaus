import { BcryptHasher } from "../infrastructure/services/bcrypt-hasher";
import { ResendEmailService } from "../infrastructure/services/email-service";
import { GoogleDriveServiceImpl } from "../infrastructure/services/google-drive-service";
import { GoogleTokenRefresher } from "../infrastructure/services/google-token-refresh";
import { ConfigProvider } from "../infrastructure/services/config-provider";
import { StructuredAuditLogger } from "../infrastructure/services/audit-logger";
import { GoogleOAuthProvider } from "../infrastructure/services/google-oauth-provider";
import { GitHubOAuthProvider } from "../infrastructure/services/github-oauth-provider";
import { SocketIoRealtimeNotifier } from "../infrastructure/socket/realtime-notifier";
import { OutboxWebhookDispatcher } from "../infrastructure/services/webhook-dispatcher";
import { FetchWebhookSender } from "../infrastructure/services/webhook-sender";
import { WebhookDeliveryService } from "../infrastructure/services/webhook-delivery-service";
import type { Repositories } from "./repositories";

export function createServices(repos: Repositories) {
  const hasher = new BcryptHasher();
  const configProvider = new ConfigProvider(repos.integrationSecretsRepo);
  const emailService = new ResendEmailService(configProvider);
  const driveService = new GoogleDriveServiceImpl();
  const tokenRefresher = new GoogleTokenRefresher(repos.oauthTokenRepo);
  const auditLogger = new StructuredAuditLogger();
  const googleOAuthProvider = new GoogleOAuthProvider();
  const githubOAuthProvider = new GitHubOAuthProvider();
  const realtimeNotifier = new SocketIoRealtimeNotifier();
  // Without an encryption key there is nowhere to keep a webhook secret, so the feature is off.
  const webhookDispatcher = repos.webhookRepo
    ? new OutboxWebhookDispatcher(repos.webhookRepo)
    : undefined;
  const webhookSender = new FetchWebhookSender();
  const webhookDelivery = repos.webhookRepo
    ? new WebhookDeliveryService(repos.webhookRepo, webhookSender)
    : undefined;

  return {
    hasher,
    configProvider,
    emailService,
    driveService,
    tokenRefresher,
    auditLogger,
    googleOAuthProvider,
    githubOAuthProvider,
    realtimeNotifier,
    webhookDispatcher,
    webhookSender,
    webhookDelivery,
  };
}

export type Services = ReturnType<typeof createServices>;

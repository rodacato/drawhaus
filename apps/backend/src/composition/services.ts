import { BcryptHasher } from "../infrastructure/services/bcrypt-hasher";
import { ResendEmailService } from "../infrastructure/services/email-service";
import { GoogleDriveServiceImpl } from "../infrastructure/services/google-drive-service";
import { GoogleTokenRefresher } from "../infrastructure/services/google-token-refresh";
import { ConfigProvider } from "../infrastructure/services/config-provider";
import { StructuredAuditLogger } from "../infrastructure/services/audit-logger";
import type { Repositories } from "./repositories";

export function createServices(repos: Repositories) {
  const hasher = new BcryptHasher();
  const configProvider = new ConfigProvider(repos.integrationSecretsRepo);
  const emailService = new ResendEmailService(configProvider);
  const driveService = new GoogleDriveServiceImpl();
  const tokenRefresher = new GoogleTokenRefresher(repos.oauthTokenRepo);
  const auditLogger = new StructuredAuditLogger();

  return { hasher, configProvider, emailService, driveService, tokenRefresher, auditLogger };
}

export type Services = ReturnType<typeof createServices>;

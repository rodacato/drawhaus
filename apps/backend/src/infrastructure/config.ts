import { readFileSync } from "node:fs";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";

// npm_package_version exists only under npm; the production image starts node directly.
function readRootVersion(): string {
  const rootManifest = path.resolve(__dirname, "../../../../package.json");
  return JSON.parse(readFileSync(rootManifest, "utf8")).version;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value && isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

// An empty or host-less URL would leave CORS, the socket origin and every emailed link pointing nowhere.
function requirePublicUrl(name: string): string {
  const value = requireEnv(name);
  const url = URL.canParse(value) ? new URL(value) : null;
  if (!url || !["http:", "https:"].includes(url.protocol) || !url.hostname) {
    throw new Error(`${name} must be an absolute http(s) URL with a hostname, got "${value}"`);
  }
  return value;
}

const frontendUrl = isProduction
  ? requirePublicUrl("FRONTEND_URL")
  : process.env.FRONTEND_URL || "http://localhost:5173";

export const config = {
  port: Number(process.env.PORT) || 4000,
  metricsEnabled: process.env.METRICS_ENABLED === "true",
  metricsToken: process.env.METRICS_TOKEN ?? "",
  frontendUrl,
  databaseUrl: isProduction
    ? requireEnv("DATABASE_URL")
    : (process.env.DATABASE_URL ?? "postgres://drawhaus:drawhaus@db:5432/drawhaus"),
  sessionSecret: isProduction
    ? requireEnv("SESSION_SECRET")
    : (process.env.SESSION_SECRET ?? "dev-secret"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  sessionTtlDays: 30,
  cookieName: "drawhaus_session",
  cookieDomain: process.env.COOKIE_DOMAIN,
  sentryDsn: process.env.SENTRY_DSN ?? "",
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  sentryRelease: process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT ?? undefined,
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL || `noreply@${new URL(frontendUrl).hostname}`,
  // Google OAuth (optional — feature disabled when not set)
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  // GitHub OAuth (optional — feature disabled when not set)
  // Prefixed with GH_ instead of GITHUB_ because GitHub reserves that prefix
  githubClientId: process.env.GH_CLIENT_ID ?? "",
  githubClientSecret: process.env.GH_CLIENT_SECRET ?? "",
  githubRedirectUri: process.env.GH_REDIRECT_URI ?? "",
  redisUrl: process.env.REDIS_URL,
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  backupPath: process.env.BACKUP_PATH ?? "/data/backups",
  appVersion: readRootVersion(),
  gitCommit: process.env.GIT_COMMIT ?? "unknown",
  deployedAt: process.env.DEPLOYED_AT ?? new Date().toISOString(),
} as const;

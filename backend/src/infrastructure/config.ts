const isProduction = process.env.NODE_ENV === "production";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value && isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  frontendUrl: isProduction
    ? requireEnv("FRONTEND_URL")
    : process.env.FRONTEND_URL ?? "http://localhost:5173",
  databaseUrl: isProduction
    ? requireEnv("DATABASE_URL")
    : process.env.DATABASE_URL ?? "postgres://drawhaus:drawhaus@db:5432/drawhaus",
  sessionSecret: isProduction
    ? requireEnv("SESSION_SECRET")
    : process.env.SESSION_SECRET ?? "dev-secret",
  nodeEnv: process.env.NODE_ENV ?? "development",
  sessionTtlDays: 30,
  cookieName: "drawhaus_session",
  cookieDomain: process.env.COOKIE_DOMAIN as string | undefined,
  honeybadgerApiKey: process.env.HONEYBADGER_API_KEY as string | undefined,
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL ?? "noreply@drawhaus.app",
  // Google OAuth (optional — feature disabled when not set)
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  redisUrl: process.env.REDIS_URL as string | undefined,
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  backupPath: process.env.BACKUP_PATH ?? "/data/backups",
  appVersion: process.env.npm_package_version ?? "0.0.0",
  gitCommit: process.env.GIT_COMMIT ?? "unknown",
  deployedAt: process.env.DEPLOYED_AT ?? new Date().toISOString(),
} as const;

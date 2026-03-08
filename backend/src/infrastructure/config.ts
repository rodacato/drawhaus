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
    : process.env.FRONTEND_URL ?? "http://localhost:3000",
  databaseUrl: isProduction
    ? requireEnv("DATABASE_URL")
    : process.env.DATABASE_URL ?? "postgres://drawhaus:drawhaus@db:5432/drawhaus",
  sessionSecret: isProduction
    ? requireEnv("SESSION_SECRET")
    : process.env.SESSION_SECRET ?? "dev-secret",
  nodeEnv: process.env.NODE_ENV ?? "development",
  sessionTtlDays: 30,
  cookieName: "drawhaus_session",
} as const;

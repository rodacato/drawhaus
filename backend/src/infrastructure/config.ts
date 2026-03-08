export const config = {
  port: Number(process.env.PORT) || 4000,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://drawhaus:drawhaus@db:5432/drawhaus",
  nodeEnv: process.env.NODE_ENV ?? "development",
  sessionTtlDays: 30,
  cookieName: "drawhaus_session",
} as const;

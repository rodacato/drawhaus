const DEFAULT_DATABASE_URL = "postgres://drawhaus:drawhaus@db:5432/drawhaus_e2e";
const DISPOSABLE_DATABASE = /_(e2e|test)$/;

export function e2eDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!DISPOSABLE_DATABASE.test(name)) {
    throw new Error(
      `Refusing to run E2E against database "${name}": its name must end in _e2e or _test, ` +
        "because the suite wipes it on every server start.",
    );
  }
  return url;
}

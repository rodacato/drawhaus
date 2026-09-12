import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./support/e2e-env";

const CI = !!process.env.CI;
// Never attach to a server we did not start unless explicitly asked: on a shared
// machine a foreign dev server on 4000/5173 would run the suite against its database.
const reuseExistingServer = process.env.E2E_REUSE_SERVER === "1";
const databaseUrl = e2eDatabaseUrl();

const chromium = {
  ...devices["Desktop Chrome"],
  storageState: "tests/.auth/user.json",
  launchOptions: {
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-background-timer-throttling",
    ],
  },
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
  },

  projects: [
    { name: "setup", testMatch: /global-setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /marketing\//,
      use: chromium,
      dependencies: ["setup"],
    },
    ...(process.env.E2E_MARKETING === "1"
      ? [
          {
            name: "marketing",
            testMatch: /marketing\/.*\.spec\.ts/,
            use: chromium,
            dependencies: ["setup"],
          },
        ]
      : []),
  ],

  webServer: [
    {
      // Runs the backend directly (not the dev script) so no developer .env leaks in:
      // Redis is only used when REDIS_URL is already in the environment.
      command: "npx tsx ../../e2e/scripts/reset-db.ts && npx tsx src/main.ts",
      url: "http://localhost:4000/health",
      reuseExistingServer,
      cwd: "../apps/backend",
      env: {
        NODE_ENV: "test",
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-test-secret",
        // Without it the webhook repository is null and its admin surface reports itself unavailable.
        ENCRYPTION_KEY: "0".repeat(64),
        PORT: "4000",
        FRONTEND_URL: "http://localhost:5173",
      },
      timeout: 90_000,
    },
    {
      command: "npx vite --port 5173 --strictPort",
      port: 5173,
      reuseExistingServer,
      cwd: "../apps/frontend",
      timeout: 90_000,
    },
  ],
});

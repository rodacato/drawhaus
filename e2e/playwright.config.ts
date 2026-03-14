import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],

  expect: {
    toHaveScreenshot: { timeout: 15_000 },
  },

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
      use: {
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
      },
      dependencies: ["setup"],
    },
  ],

  webServer: [
    {
      command: "npm run dev --workspace=backend",
      port: 4000,
      reuseExistingServer: !CI,
      cwd: "..",
      env: {
        NODE_ENV: "test",
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgres://drawhaus:drawhaus@db:5432/drawhaus",
        SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-test-secret",
        PORT: "4000",
        FRONTEND_URL: "http://localhost:5173",
      },
      timeout: 60_000,
    },
    {
      command: "npm run dev --workspace=frontend",
      port: 5173,
      reuseExistingServer: !CI,
      cwd: "..",
      timeout: 60_000,
    },
  ],
});

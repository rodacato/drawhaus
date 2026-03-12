import { test as base } from "@playwright/test";

export const TEST_USER = {
  name: "E2E Test User",
  email: "e2e@drawhaus.test",
  password: "Test1234!pass",
};

/**
 * Extended test fixture that provides an authenticated page.
 * Uses the saved storage state from global-setup so each test
 * doesn't need to log in again.
 */
export const test = base.extend<{ authenticatedPage: typeof base }>({});

// Re-export expect for convenience
export { expect } from "@playwright/test";

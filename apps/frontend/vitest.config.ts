import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: false,
      include: ["src/__tests__/**/*.test.{ts,tsx}"],
      setupFiles: ["src/__tests__/_setup.ts"],
      coverage: {
        provider: "v8",
        include: ["src/**"],
        exclude: ["src/__tests__/**", "src/**/*.d.ts", "src/pages/AdminStyleGuide.tsx"],
        reporter: ["text", "lcov"],
        reportsDirectory: "coverage",
      },
    },
  }),
);

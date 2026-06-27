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
        exclude: [
          "src/__tests__/**",
          "src/**/*.d.ts",
          "src/**/*.css",
          // Bootstrap / barrels / type-only — no runtime logic to cover.
          "src/main.tsx",
          "src/components/dashboard/index.ts",
          "src/lib/types.ts",
          "src/lib/hooks/collaboration/types.ts",
          "src/components/shared/DiagramTypes.ts",
          "src/components/settings/tabs.tsx",
          // Pure-presentation SVG icon sets.
          "src/components/Icons.tsx",
          "src/components/board-sidebar/icons.tsx",
          // Static / marketing pages — behaviour is visual, covered by e2e not unit.
          "src/pages/AdminStyleGuide.tsx",
          "src/pages/Terms.tsx",
          "src/pages/Privacy.tsx",
          "src/pages/NotFound.tsx",
          "src/pages/MaintenancePage.tsx",
          // Static template seed data.
          "src/data/templates/**",
        ],
        reporter: ["text", "lcov"],
        reportsDirectory: "coverage",
      },
    },
  }),
);

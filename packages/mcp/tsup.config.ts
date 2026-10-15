import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  minify: false,
  noExternal: ["@drawhaus/helpers"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});

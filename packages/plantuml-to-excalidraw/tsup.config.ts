import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  minify: false,
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  clean: true,
  sourcemap: true,
  external: ["@drawhaus/helpers", "@excalidraw/mermaid-to-excalidraw", "mermaid"],
});

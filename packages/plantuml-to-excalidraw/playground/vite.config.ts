import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 3456,
    open: true,
  },
  build: {
    outDir: path.resolve(__dirname, "../public"),
  },
});

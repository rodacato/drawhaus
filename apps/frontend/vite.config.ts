import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import peggy from "peggy";

function peggyPlugin(): Plugin {
  return {
    name: "vite-plugin-peggy",
    transform(code, id) {
      if (!id.endsWith(".peggy")) return null;
      const source = peggy.generate(code, {
        output: "source",
        format: "es",
      });
      return { code: source, map: null };
    },
  };
}

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react(), peggyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/health": "http://localhost:4000",
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
    },
  },
});

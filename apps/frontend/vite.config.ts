import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "path";

const sentryAuth = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryRelease = process.env.VITE_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE;
const uploadSourcemaps = Boolean(sentryAuth && sentryOrg && sentryProject);

// Must match window.EXCALIDRAW_ASSET_PATH (src/lib/excalidraw-assets.ts) + "fonts".
const EXCALIDRAW_FONTS_ROUTE = "/excalidraw/fonts";
const excalidrawFontsDir = path.join(
  path.dirname(createRequire(__filename).resolve("@excalidraw/excalidraw")),
  "fonts",
);

function excalidrawFonts(): Plugin {
  return {
    name: "drawhaus:excalidraw-fonts",
    configureServer(server) {
      server.middlewares.use(EXCALIDRAW_FONTS_ROUTE, (req, res) => {
        const file = path.join(excalidrawFontsDir, (req.url ?? "").split("?")[0]);
        const isFont =
          file.startsWith(excalidrawFontsDir + path.sep) &&
          fs.statSync(file, { throwIfNoEntry: false })?.isFile();
        if (!isFont) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "font/woff2");
        fs.createReadStream(file).pipe(res);
      });
    },
    // Not fs.cpSync: on Docker Desktop mounts its copies end up mode 0200, which nginx answers with 403.
    writeBundle({ dir }) {
      const fonts = fs.readdirSync(excalidrawFontsDir, { recursive: true, withFileTypes: true });
      for (const font of fonts.filter((entry) => entry.isFile())) {
        const from = path.join(font.parentPath, font.name);
        const to = path.join(dir!, EXCALIDRAW_FONTS_ROUTE, path.relative(excalidrawFontsDir, from));
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
      }
    },
  };
}

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  plugins: [
    react(),
    excalidrawFonts(),
    ...(uploadSourcemaps
      ? [
          sentryVitePlugin({
            authToken: sentryAuth,
            org: sentryOrg,
            project: sentryProject,
            release: sentryRelease ? { name: sentryRelease } : undefined,
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: uploadSourcemaps,
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

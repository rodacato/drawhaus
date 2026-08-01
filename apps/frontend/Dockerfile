# Use slim (glibc) for builder — Alpine/musl breaks npm optional deps
# for native bindings (rollup, lightningcss) even with npm install
FROM node:25-slim AS builder
WORKDIR /app

# Copy all package manifests for workspace resolution
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/helpers/package.json packages/helpers/
COPY packages/mcp/package.json packages/mcp/
COPY packages/mermaid-to-excalidraw/package.json packages/mermaid-to-excalidraw/
COPY packages/plantuml-to-excalidraw/package.json packages/plantuml-to-excalidraw/
COPY e2e/package.json e2e/

# npm ci + lockfile skips platform-specific optional deps (npm/cli#4828)
# Fresh install without lockfile resolves correct native bindings
RUN rm package-lock.json && npm install

# Copy source for frontend and its workspace dependencies
COPY packages/helpers/ packages/helpers/
COPY packages/mermaid-to-excalidraw/ packages/mermaid-to-excalidraw/
COPY packages/plantuml-to-excalidraw/ packages/plantuml-to-excalidraw/
COPY apps/frontend/ apps/frontend/

# Build workspace packages first, then frontend
ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_GOOGLE_API_KEY=""
ARG VITE_SENTRY_DSN=""
ARG VITE_SENTRY_ENVIRONMENT=""
ARG VITE_SENTRY_RELEASE=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE

# Source map upload (build-time only — @sentry/vite-plugin reads process.env).
# All three must be set for the upload to run; otherwise the plugin is a no-op.
ARG SENTRY_AUTH_TOKEN=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

RUN npm run build --workspace=@drawhaus/helpers \
 && npm run build --workspace=@drawhaus/mermaid-to-excalidraw \
 && npm run build --workspace=@drawhaus/plantuml-to-excalidraw \
 && npm run build --workspace=frontend

# ── Production ──
FROM nginx:alpine AS production
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

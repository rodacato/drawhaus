FROM node:20-alpine AS builder
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

# npm ci may miss platform-specific optional deps (rollup musl bindings)
RUN npm ci && npm i @rollup/rollup-linux-x64-musl 2>/dev/null || npm install

# Copy source for backend and its workspace dependency
COPY packages/helpers/ packages/helpers/
COPY apps/backend/ apps/backend/

# Build helpers first (backend depends on it), then backend
RUN npm run build --workspace=@drawhaus/helpers \
 && npm run build --workspace=backend

# ── Production ──
FROM node:20-alpine AS production
RUN apk add --no-cache postgresql16-client
WORKDIR /app

ARG GIT_COMMIT=unknown
ENV NODE_ENV=production
ENV GIT_COMMIT=$GIT_COMMIT

# Copy workspace manifests for production install
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/helpers/package.json packages/helpers/
COPY packages/mcp/package.json packages/mcp/
COPY packages/mermaid-to-excalidraw/package.json packages/mermaid-to-excalidraw/
COPY packages/plantuml-to-excalidraw/package.json packages/plantuml-to-excalidraw/
COPY e2e/package.json e2e/

RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist apps/backend/dist
COPY --from=builder /app/apps/backend/src/migrations apps/backend/dist/migrations
COPY --from=builder /app/packages/helpers/dist packages/helpers/dist

WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["node", "dist/main.js"]

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

RUN npm ci

# Copy source for frontend and its workspace dependencies
COPY packages/helpers/ packages/helpers/
COPY packages/mermaid-to-excalidraw/ packages/mermaid-to-excalidraw/
COPY packages/plantuml-to-excalidraw/ packages/plantuml-to-excalidraw/
COPY apps/frontend/ apps/frontend/

# Build workspace packages first, then frontend
ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_GOOGLE_API_KEY=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY

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

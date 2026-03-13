FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache postgresql16-client
WORKDIR /app
ARG GIT_COMMIT=unknown
ENV NODE_ENV=production
ENV GIT_COMMIT=$GIT_COMMIT
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
EXPOSE 4000
CMD ["node", "dist/main.js"]

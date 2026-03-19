<p align="center">
  <img src="docs/branding/logo_stacked_light.svg" alt="Drawhaus" height="120" />
</p>

<h3 align="center">Your whiteboard, on your server.</h3>

<p align="center">
  Self-hosted collaborative diagramming tool built on Excalidraw.<br/>
  Real-time collaboration. No subscription. Your data, your rules.
</p>

---

## What is Drawhaus?

Drawhaus is a self-hosted Excalidraw alternative for developers and small teams who want full control over their diagramming tool. No SaaS, no $6/mo subscription — just deploy it on your server and own your data.

### Features

- **Full Excalidraw editor** — all the drawing tools you know
- **Real-time collaboration** — live cursors, presence, viewport follow

- **Share links** — invite collaborators with editor/viewer roles and expiration
- **Guest access** — join via share token, no account required
- **Comments** — threaded discussions with resolve/unresolve workflow
- **Folders & search** — organize and find diagrams quickly
- **Admin panel** — user management, metrics, invite flow, registration toggle
- **Dark/light theme** — system-aware with manual toggle
- **Auto-save & thumbnails** — never lose work, see previews on dashboard
- **Self-hosted** — deploy with Docker + Kamal, or run locally

---

## Quick Start

### Prerequisites

- **Node.js** 22+
- **PostgreSQL** 16+ (or use Docker)

### Option 1: Local development

Requires a running PostgreSQL 16+ instance. The backend auto-creates all tables on first run.

```bash
git clone https://github.com/rodacato/drawhaus.git
cd drawhaus
cp .env.example .env          # edit DATABASE_URL if your PG is not on localhost:5432
npm install
npm run dev
```

This starts:
- **Frontend** at http://localhost:5173 (Vite dev server)
- **Backend** at http://localhost:4000 (Express)

> **Tip:** If you don't have PostgreSQL installed locally, use Option 2 (Docker Compose) or Option 3 (Dev Container) instead.

### Option 2: Docker Compose

```bash
cp .env.example .env   # edit .env to add Google OAuth keys, etc.
docker compose up
```

Docker Compose reads `.env` automatically. Starts everything — frontend, backend, PostgreSQL, and Redis:

| Service  | URL / Port              | Notes |
|----------|-------------------------|-------|
| Frontend | http://localhost:5173   | Vite dev server |
| Backend  | http://localhost:4300   | Mapped from internal port 4000 |
| Postgres | localhost:5643          | Mapped from internal port 5432 |
| Redis    | localhost:6479          | Mapped from internal port 6379 |

> **Note:** Docker Compose maps the backend to port **4300** externally (not 4000). The frontend Vite proxy handles routing `/api` calls to the backend automatically, so you only need to access http://localhost:5173.

### Option 3: Dev Container

1. Open the project in VS Code
2. Run **Dev Containers: Reopen in Container**
3. `npm run dev`

The devcontainer includes Node 22, PostgreSQL, GitHub CLI, and forwarded ports.

### First-time setup

After starting, visit the app and you'll be redirected to `/setup` to create the first admin account.

---

## Environment Variables

### Backend — Infrastructure

> These must be set as env vars (GitHub Actions secrets or deploy config). They are needed at server boot before DB is available and **cannot** be moved to the database.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (prod) | `dev-secret` | Session cookie signing key |
| `PORT` | No | `4000` | Server port |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin |
| `COOKIE_DOMAIN` | No | — | Cookie domain for subdomain sharing (e.g. `.drawhaus.dev`) |
| `REDIS_URL` | No | — | Redis connection string. Required for multi-container deployments (Socket.IO scaling) |
| `ENCRYPTION_KEY` | No | — | 32-byte hex key for encrypting integration secrets in DB. Generate with `openssl rand -hex 32` |
| `BACKUP_PATH` | No | `/data/backups` | Directory to store backup files (filesystem path, must be an env var) |

> **Backup schedule, retention, and enable/disable** are configured from the admin panel (Settings → Database Backups) or during the setup wizard. They are stored in the `site_settings` table. Env vars `BACKUP_ENABLED`, `BACKUP_CRON`, and `BACKUP_RETENTION_DAYS` are used as fallback defaults only if the DB values are not yet set.

### Backend — Integration Secrets (DB-configurable)

> When `ENCRYPTION_KEY` is set, these can be managed from the **admin panel** (Settings → Integrations) instead of env vars. The app checks the DB first, then falls back to env vars. After migrating to the DB, you can remove these from GitHub secrets.

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID. Leave blank to disable Google login |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | — | Google OAuth callback URL (e.g. `https://api.yourdomain.com/api/auth/google/callback`) |
| `RESEND_API_KEY` | — | Resend API key for emails. If blank, emails log to console |
| `FROM_EMAIL` | `noreply@drawhaus.dev` | Sender address for transactional emails |
| `HONEYBADGER_API_KEY` | — | Error monitoring (optional) |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | — | Backend URL. Leave empty in dev (Vite proxy handles it) |
| `VITE_WS_URL` | No | — | WebSocket URL. Leave empty in dev |
| `VITE_GOOGLE_API_KEY` | No | — | Google Picker API key for Drive file browser. Leave blank to disable |

> **Local dev:** Copy `.env.example` to `.env` — Docker Compose loads it automatically. For production, configure secrets in GitHub Actions (see [Deployment](#deployment)).

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Frontend only (Vite on :5173) |
| `npm run dev:backend` | Backend only (Express on :4000) |
| `npm run build` | Production build (both workspaces) |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm test --workspace=backend` | Run backend unit & integration tests |
| `cd e2e && npm test` | Run Playwright end-to-end tests (requires running backend + frontend + PG) |
| `cd e2e && npm run test:ui` | Open Playwright test runner UI |
| `npm run db:seed` | Seed database with test data |
| `npm run db:reset` | Drop all tables, recreate schema, and seed |
| `npm run db:backup --workspace=backend` | Create an on-demand database backup |
| `npm run db:restore --workspace=backend -- latest` | Restore database from most recent backup |

---

## Project Structure

```
drawhaus/
├── frontend/          # React + Vite + Excalidraw SPA
│   ├── src/
│   │   ├── api/       # Axios API clients (auth, diagrams, admin, etc.)
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/  # React contexts (Auth, Theme)
│   │   ├── hooks/     # Custom hooks (useAuth, useCollaboration)
│   │   ├── layouts/   # Route layouts (Protected, Admin, Auth)
│   │   ├── pages/     # Page components
│   │   └── lib/       # Utilities, types, collaboration logic
│   └── vite.config.ts
├── backend/           # Express + Socket.IO + PostgreSQL (Clean Architecture)
│   └── src/
│       ├── application/    # Use cases (business logic, one file per action)
│       ├── domain/         # Domain entities and interfaces
│       └── infrastructure/ # Routes, repos, services, socket handlers
│           ├── http/       # Express routes + middleware
│           ├── repositories/ # PostgreSQL data access
│           ├── services/   # External services (email, backup, encryption)
│           └── socket/     # Socket.IO event handlers
├── config/            # Kamal deployment configs
├── docs/              # Branding assets and design mockups
└── docker-compose.yml # Local dev orchestration
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + React Router + Tailwind CSS |
| Editor | Excalidraw |
| Backend | Express + Socket.IO + Zod |
| Database | PostgreSQL 16 |
| Email | Resend (transactional) |
| Deployment | Kamal (backend + frontend) |
| CI | GitHub Actions |
| Monitoring | Honeybadger |

---

## Deployment

Drawhaus is fully self-hosted — both frontend and backend deploy to your server via **Kamal**:

- **Frontend** — Nginx container serving the static SPA (deployed via Kamal)
- **Backend** — Express + Socket.IO container (deployed via Kamal)
- **Database** — PostgreSQL on the same server (managed as a Kamal accessory)

### Architecture

```
       yourdomain.com         api.yourdomain.com
              │                       │
              ▼                       ▼
        ┌───────────────────────────────────┐
        │          Kamal Proxy              │
        │    (routes by host header)        │
        └──────┬──────────────┬─────────────┘
               │              │
          Nginx (SPA)    Express + Socket.IO
          :80                 :4000
                              │
                          PostgreSQL
```

### Prerequisites

- A VPS or dedicated server with Docker installed
- A domain name (any DNS provider works)
- A GitHub account (for GHCR container registry)

### Step 1: Backend setup

1. **Create a `deploy` user on your server** with Docker access:
   ```bash
   ssh root@YOUR_SERVER
   adduser deploy
   usermod -aG docker deploy
   ```

2. **Configure GitHub Actions secrets** — see the [GitHub Actions secrets](#github-actions-secrets) table below. These are stored in the `production` environment in your GitHub repo (Settings → Environments → production). Both backend and frontend deploy jobs share this environment.

3. **First deploy with Kamal** (from your local machine):
   ```bash
   kamal setup -c config/deploy.backend.yml
   ```
   This provisions the server: boots PostgreSQL, builds the Docker image, and starts the backend.

4. **Subsequent deploys** happen automatically via GitHub Actions when you push to the `production` branch. You can also trigger manually from the Actions tab.

### Step 2: Frontend setup

The frontend is deployed as a separate Kamal service on the same server. No external hosting (Cloudflare Pages, Vercel, etc.) is needed.

1. **First deploy** (from your local machine):
   ```bash
   kamal setup -c config/deploy.frontend.yml
   ```

2. **Subsequent deploys** are automatic — the GitHub Actions workflow deploys the frontend after the backend (sequentially, with the backend health check as a gate).

3. **DNS**: Point your frontend domain (e.g. `yourdomain.com`) and backend domain (e.g. `api.yourdomain.com`) to your server's IP. Kamal Proxy routes by host header.

### Deploy workflow

The normal deploy flow is:

```bash
# 1. Develop on feature branches, merge to master
git checkout master && git pull

# 2. When ready to deploy, push master to production
git push origin master:production
```

This triggers the GitHub Actions [deploy workflow](.github/workflows/build-push.yml):

1. **Build backend** → push image to GHCR
2. **Build frontend** → push image to GHCR (runs in parallel with step 1)
3. **Deploy backend** via Kamal → health check passes
4. **Deploy frontend** via Kamal → waits for backend to be healthy first

### GitHub Actions secrets

Configure these in your GitHub repo under **Settings → Environments → production** (both backend and frontend deploy jobs use the `production` environment):

| Secret | Description |
|--------|-------------|
| `HOST_IP` | Your server's IP address |
| `SSH_PRIVATE_KEY` | SSH key for the `deploy` user on your server |
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgres://drawhaus:PASSWORD@localhost:5433/drawhaus_production`) |
| `SESSION_SECRET` | Random string for session signing (`openssl rand -hex 32`) |
| `FRONTEND_URL` | Your frontend URL (e.g. `https://yourdomain.com`) |
| `COOKIE_DOMAIN` | (Optional) Parent domain for cookies (e.g. `.yourdomain.com`) — only needed for cross-subdomain setups |
| `POSTGRES_PASSWORD` | PostgreSQL password (`openssl rand -hex 32`) |
| `HONEYBADGER_API_KEY` | (Optional) Honeybadger error monitoring key |
| `RESEND_API_KEY` | (Optional) Resend API key for emails — without it, emails log to console |
| `FROM_EMAIL` | (Optional) Sender address for transactional emails |
| `GOOGLE_CLIENT_ID` | (Optional) Google OAuth client ID — leave blank to disable Google login |
| `GOOGLE_CLIENT_SECRET` | (Optional) Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | (Optional) Google OAuth redirect URI (e.g. `https://api.yourdomain.com/api/auth/google/callback`) |
| `REDIS_URL` | (Optional) Redis connection string for Socket.IO scaling |
| `ENCRYPTION_KEY` | (Optional) 32-byte hex key for encrypting integration secrets (`openssl rand -hex 32`) |

### Manual deploy commands

```bash
# Deploy backend manually (from local machine)
kamal deploy -c config/deploy.backend.yml

# Deploy frontend manually
kamal deploy -c config/deploy.frontend.yml

# Check status
kamal details -c config/deploy.backend.yml
kamal details -c config/deploy.frontend.yml

# View logs
kamal app logs -c config/deploy.backend.yml
kamal app logs -c config/deploy.frontend.yml

# Rollback
kamal rollback -c config/deploy.backend.yml
kamal rollback -c config/deploy.frontend.yml
```

---

## API Overview

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (DB status, uptime) |
| `GET` | `/api/version` | App version, commit, deploy date |
| `GET` | `/api/site/status` | Site status (maintenance, instance name) |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/setup-status` | Check if initial setup is needed |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/auth/me` | Current user |
| `PATCH` | `/api/auth/me` | Update profile (name, email) |
| `POST` | `/api/auth/change-password` | Change password |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `DELETE` | `/api/auth/account` | Delete account |
| `GET` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/auth/google/callback` | Google OAuth callback |

### Setup
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/setup/status` | Current setup step (1–3 or complete) |
| `POST` | `/api/setup/step-2` | Set instance name and registration |
| `POST` | `/api/setup/skip-integrations` | Skip integration setup |
| `POST` | `/api/setup/complete` | Mark setup as complete |

### Diagrams
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/diagrams` | List diagrams (filter by folder/workspace) |
| `GET` | `/api/diagrams/search` | Search diagrams by query |
| `POST` | `/api/diagrams` | Create diagram |
| `GET` | `/api/diagrams/:id` | Get diagram |
| `PATCH` | `/api/diagrams/:id` | Update diagram |
| `DELETE` | `/api/diagrams/:id` | Delete diagram |
| `PUT` | `/api/diagrams/:id/thumbnail` | Update thumbnail |
| `POST` | `/api/diagrams/:id/move` | Move to folder |
| `PATCH` | `/api/diagrams/:id/star` | Toggle starred |
| `POST` | `/api/diagrams/:id/duplicate` | Duplicate diagram |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/diagrams/:id/comments` | List comment threads |
| `POST` | `/api/diagrams/:id/comments` | Create comment |
| `POST` | `/api/diagrams/:id/comments/:threadId/replies` | Reply to thread |
| `PATCH` | `/api/diagrams/:id/comments/:threadId/resolve` | Resolve/unresolve |
| `DELETE` | `/api/diagrams/:id/comments/:threadId` | Delete thread |
| `POST` | `/api/diagrams/:id/comments/:threadId/like` | Toggle like |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | List folders |
| `POST` | `/api/folders` | Create folder |
| `PATCH` | `/api/folders/:id` | Rename folder |
| `DELETE` | `/api/folders/:id` | Delete folder |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tags` | List tags |
| `POST` | `/api/tags` | Create tag |
| `PATCH` | `/api/tags/:id` | Update tag |
| `DELETE` | `/api/tags/:id` | Delete tag |
| `POST` | `/api/tags/:id/assign` | Assign tag to diagram |
| `POST` | `/api/tags/:id/unassign` | Remove tag from diagram |

### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces` | List workspaces |
| `POST` | `/api/workspaces` | Create workspace |
| `GET` | `/api/workspaces/:id` | Get workspace |
| `PATCH` | `/api/workspaces/:id` | Update workspace |
| `DELETE` | `/api/workspaces/:id` | Delete workspace |
| `POST` | `/api/workspaces/:id/invite` | Invite member |
| `PATCH` | `/api/workspaces/:id/members/:userId` | Update member role |
| `DELETE` | `/api/workspaces/:id/members/:userId` | Remove member |
| `POST` | `/api/workspaces/:id/transfer-ownership` | Transfer workspace ownership to admin member |
| `GET` | `/api/workspaces/owned-shared` | List owned workspaces with other members |

### Share
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/share/:diagramId` | Create share link |
| `GET` | `/api/share/:diagramId/links` | List share links |
| `GET` | `/api/share/link/:token` | Resolve share link |
| `DELETE` | `/api/share/link/:token` | Revoke share link |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List all templates (built-in + user's custom) |
| `GET` | `/api/templates/:id` | Get single template |
| `POST` | `/api/templates` | Create custom template from current canvas |
| `POST` | `/api/templates/:id/use` | Create a new diagram from a template |
| `PATCH` | `/api/templates/:id` | Update custom template (title, description, category) |
| `DELETE` | `/api/templates/:id` | Delete custom template |
| `POST` | `/api/templates/transfer-ownership` | Bulk transfer template ownership |

### Diagrams — Transfer
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/diagrams/transfer-ownership` | Bulk transfer diagram ownership |

### Drive
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/drive/status` | Drive connection status |
| `POST` | `/api/drive/export` | Export diagram to Drive |
| `POST` | `/api/drive/import` | Import from Drive |
| `POST` | `/api/drive/backup/toggle` | Toggle auto-backup |
| `POST` | `/api/drive/disconnect` | Disconnect Drive |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/metrics` | Instance metrics |
| `GET` | `/api/admin/users` | List all users |
| `PATCH` | `/api/admin/users/:id` | Update user (role, status) |
| `DELETE` | `/api/admin/users/:id` | Delete user |
| `GET` | `/api/admin/settings` | Get site settings |
| `PATCH` | `/api/admin/settings` | Update site settings |
| `POST` | `/api/admin/invite` | Send invite email |
| `GET` | `/api/admin/invitations` | List pending invitations |
| `GET` | `/api/admin/integrations` | Get integration secrets status |
| `PATCH` | `/api/admin/integrations` | Update integration secrets |
| `GET` | `/api/admin/backups` | List database backups |
| `POST` | `/api/admin/backups/trigger` | Trigger manual backup |

---

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page (redirects to dashboard if logged in) |
| `/setup` | Public | First-time admin creation |
| `/login` | Public | Sign in |
| `/register` | Public | Create account |
| `/forgot-password` | Public | Request password reset |
| `/reset-password/:token` | Public | Set new password |
| `/dashboard` | Authenticated | Diagram list with folders |
| `/board/:id` | Authenticated | Excalidraw editor |
| `/settings` | Authenticated | Profile, security, preferences |
| `/admin` | Admin only | User management, metrics, invites |
| `/share/:token` | Public | Join session via share link |
| `/embed/:token` | Public | Read-only embed view |

---

## Testing

### Unit & Integration Tests

```bash
npm test --workspace=backend
```

### End-to-End Tests (Playwright)

E2E tests require a running backend, frontend, and PostgreSQL:

```bash
# Option A: Use Docker Compose (easiest)
docker compose up -d

# Option B: Start services manually
npm run dev  # in one terminal

# Then run the tests (from e2e/ directory)
cd e2e
npm test

# Or open the Playwright UI
npm run test:ui
```

> **Note:** The first run installs Playwright browsers automatically. Tests create their own test users via the global setup.

---

## Contributing

1. Fork the repo and create a feature branch
2. Make changes — keep PRs small and focused
3. Run `npm run lint && npm run typecheck` before pushing
4. Run `npm test --workspace=backend` to verify backend tests pass
5. Open a PR against `master`

CI runs automatically on every PR (lint, typecheck, backend tests, build).

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the feature plan.

## Branding

See [docs/branding/BRANDING.md](docs/branding/BRANDING.md) for the brand guide, assets, and design tokens.

---

<p align="center">
  <sub>Built by <a href="https://github.com/rodacato">@rodacato</a> — an indie builder who'd rather self-host than subscribe.</sub>
</p>

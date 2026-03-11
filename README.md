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
- **Multi-scene diagrams** — multiple pages per diagram with tab navigation
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

```bash
git clone https://github.com/rodacato/drawhaus.git
cd drawhaus
npm install
npm run dev
```

This starts:
- **Frontend** at http://localhost:5173 (Vite dev server)
- **Backend** at http://localhost:4000 (Express)

> The backend auto-creates database tables on first run. You need a local PostgreSQL instance or use Option 2.

### Option 2: Docker Compose

```bash
cp .env.example .env   # edit .env to add Google OAuth keys, etc.
docker compose up
```

Docker Compose reads `.env` automatically. Starts everything — frontend, backend, and PostgreSQL:

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:5173   |
| Backend  | http://localhost:4300   |
| Postgres | localhost:5643          |

### Option 3: Dev Container

1. Open the project in VS Code
2. Run **Dev Containers: Reopen in Container**
3. `npm run dev`

The devcontainer includes Node 22, PostgreSQL, GitHub CLI, and forwarded ports.

### First-time setup

After starting, visit the app and you'll be redirected to `/setup` to create the first admin account.

---

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (prod) | `dev-secret` | Session cookie signing key |
| `PORT` | No | `4000` | Server port |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin |
| `COOKIE_DOMAIN` | No | — | Cookie domain for subdomain sharing (e.g. `.drawhaus.dev`) |
| `RESEND_API_KEY` | No | — | Resend API key for emails. If blank, emails log to console |
| `FROM_EMAIL` | No | `noreply@drawhaus.dev` | Sender address for transactional emails |
| `HONEYBADGER_API_KEY` | No | — | Error monitoring (optional) |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID. Leave blank to disable Google login |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | — | Google OAuth callback URL (e.g. `https://api.yourdomain.com/api/auth/google/callback`) |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | — | Backend URL. Leave empty in dev (Vite proxy handles it) |
| `VITE_WS_URL` | No | — | WebSocket URL. Leave empty in dev |
| `VITE_GOOGLE_API_KEY` | No | — | Google Picker API key for Drive file browser. Leave blank to disable |

> **Local dev:** Copy `.env.example` to `.env` — Docker Compose loads it automatically. See `.env.production.example` for the production template.

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
├── backend/           # Express + Socket.IO + PostgreSQL
│   └── src/
│       ├── application/    # Use cases
│       ├── domain/         # Domain entities
│       └── infrastructure/ # Routes, repos, services, socket handlers
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
| Deployment | Kamal + Cloudflare Tunnel |
| CI | GitHub Actions |
| Monitoring | Honeybadger |

---

## Deployment

Drawhaus uses a split deployment model:

- **Frontend** — Static SPA on **Cloudflare Pages** (auto-deploys from Git)
- **Backend** — Docker container on your server via **Kamal** (deploys via GitHub Actions)
- **Database** — PostgreSQL on the same server (managed as a Kamal accessory)

### Architecture

```
          ┌──────────────────────────────────────────┐
          │            Cloudflare Network             │
          │                                          │
          │   Cloudflare Pages    Cloudflare Tunnel  │
          │   (static SPA)        (secure proxy)     │
          └──────┬───────────────────┬───────────────┘
                 │                   │
          draw.yourdomain.com   api.yourdomain.com
                 │                   │
          React + Vite         Kamal Proxy (Thruster)
          (CDN-served)               │
                               Express + Socket.IO
                                     │
                                 PostgreSQL
```

### Prerequisites

- A VPS or dedicated server with Docker installed
- A domain name with DNS managed by Cloudflare
- A Cloudflare account (free tier works)
- A GitHub account (for GHCR container registry)

### Step 1: Backend setup

1. **Create a `deploy` user on your server** with Docker access:
   ```bash
   ssh root@YOUR_SERVER
   adduser deploy
   usermod -aG docker deploy
   ```

2. **Copy and fill in the production env file**:
   ```bash
   cp .env.production.example .env.production
   ```
   Fill in all values — see the Environment Variables section below for details.

3. **First deploy with Kamal** (from your local machine):
   ```bash
   kamal setup -c config/deploy.backend.yml
   ```
   This provisions the server: boots PostgreSQL, builds the Docker image, and starts the backend.

4. **Subsequent deploys** happen automatically via GitHub Actions when you push to the `production` branch. You can also trigger manually from the Actions tab.

### Step 2: Frontend setup (Cloudflare Pages)

1. Go to **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**
2. Select your `drawhaus` repository
3. Configure the build:

   | Setting | Value |
   |---------|-------|
   | Production branch | `production` |
   | Build command | `cd frontend && npm ci && npm run build` |
   | Build output directory | `frontend/dist` |
   | Root directory | `/` (leave empty) |

4. Add **environment variables** (Settings → Environment Variables):

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://api.yourdomain.com` |
   | `VITE_WS_URL` | `https://api.yourdomain.com` |
   | `VITE_GOOGLE_API_KEY` | Your Google Picker API key (optional — enables Drive file picker) |
   | `NODE_VERSION` | `22` |

5. (Optional) Add a **custom domain** under the Custom Domains tab (e.g. `draw.yourdomain.com`)

Cloudflare Pages will auto-deploy on every push to `production`.

### Step 3: Cloudflare Tunnel (optional but recommended)

If you don't want to expose your server's IP directly, set up a Cloudflare Tunnel to proxy traffic to your backend:

```bash
# On your server
cloudflared tunnel create drawhaus
cloudflared tunnel route dns drawhaus api.yourdomain.com
cloudflared tunnel run drawhaus
```

### Deploy workflow

The normal deploy flow is:

```bash
# 1. Develop on feature branches, merge to master
git checkout master && git pull

# 2. When ready to deploy, push master to production
git push origin master:production
```

This triggers:
- **GitHub Actions** ([build-push.yml](.github/workflows/build-push.yml)): builds the backend Docker image, pushes to GHCR, and deploys via Kamal
- **Cloudflare Pages**: detects the push and builds/deploys the frontend SPA

### GitHub Actions secrets

For the backend deploy workflow to work, configure these secrets in your GitHub repo (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `HOST_IP` | Your server's IP address |
| `SSH_PRIVATE_KEY` | SSH key for the `deploy` user on your server |
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgres://drawhaus:PASSWORD@localhost:5433/drawhaus_production`) |
| `SESSION_SECRET` | Random string for session signing (`openssl rand -hex 32`) |
| `FRONTEND_URL` | Your frontend URL (e.g. `https://draw.yourdomain.com`) |
| `COOKIE_DOMAIN` | Parent domain for cookies (e.g. `.yourdomain.com`) |
| `POSTGRES_PASSWORD` | PostgreSQL password (`openssl rand -hex 32`) |
| `HONEYBADGER_API_KEY` | (Optional) Honeybadger error monitoring key |
| `RESEND_API_KEY` | (Optional) Resend API key for emails — without it, emails log to console |
| `FROM_EMAIL` | (Optional) Sender address for transactional emails |
| `GOOGLE_CLIENT_ID` | (Optional) Google OAuth client ID — leave blank to disable Google login |
| `GOOGLE_CLIENT_SECRET` | (Optional) Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | (Optional) Google OAuth redirect URI (e.g. `https://api.yourdomain.com/api/auth/google/callback`) |

### Manual deploy commands

```bash
# Deploy backend manually (from local machine)
kamal deploy -c config/deploy.backend.yml

# Check backend status
kamal details -c config/deploy.backend.yml

# View backend logs
kamal app logs -c config/deploy.backend.yml

# Rollback backend to previous version
kamal rollback -c config/deploy.backend.yml

# Force re-deploy frontend on Cloudflare Pages
# Go to Cloudflare Dashboard → Pages → drawhaus → Deployments → Retry deployment
```

---

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |

### Diagrams
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/diagrams` | List user's diagrams |
| `POST` | `/api/diagrams` | Create diagram |
| `GET` | `/api/diagrams/:id` | Get diagram |
| `PATCH` | `/api/diagrams/:id` | Update diagram |
| `DELETE` | `/api/diagrams/:id` | Delete diagram |
| `PATCH` | `/api/diagrams/:id/star` | Toggle starred |
| `POST` | `/api/diagrams/:id/duplicate` | Duplicate diagram |

### Share
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/share/link` | Create share link |
| `GET` | `/api/share/link/:token` | Resolve share link |
| `DELETE` | `/api/share/link/:token` | Revoke share link |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/metrics` | Instance metrics |
| `GET` | `/api/admin/users` | List all users |
| `PATCH` | `/api/admin/users/:id` | Update user (role, status) |
| `POST` | `/api/admin/invite` | Send invite email |

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

## Contributing

1. Fork the repo and create a feature branch
2. Make changes — keep PRs small and focused
3. Run `npm run lint && npm run typecheck` before pushing
4. Open a PR against `master`

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

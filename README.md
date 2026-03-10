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
docker compose up
```

Starts everything — frontend, backend, and PostgreSQL:

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

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | — | Backend URL. Leave empty in dev (Vite proxy handles it) |
| `VITE_WS_URL` | No | — | WebSocket URL. Leave empty in dev |

> See `.env.production.example` for the full production template.

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

Drawhaus deploys with [Kamal](https://kamal-deploy.org/) to any server with Docker.

### Setup

1. Copy the production env template:
   ```bash
   cp .env.production.example .env.production
   ```

2. Fill in your values (server IP, database URL, session secret, etc.)

3. Deploy:
   ```bash
   kamal setup -c config/deploy.backend.yml
   ```

### Architecture

```
                    Cloudflare Tunnel
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                  │
   Cloudflare Pages    Kamal Proxy        (DNS)
   (static SPA)       (Traefik/Thruster)
        │                 │
   React + Vite      Express + Socket.IO
                          │
                      PostgreSQL
```

- **Frontend**: Static SPA on Cloudflare Pages
- **Backend**: Docker container managed by Kamal
- **Database**: PostgreSQL on the same server (Kamal accessory)

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

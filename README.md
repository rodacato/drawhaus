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

### Ships today

- Full Excalidraw editor with real-time collaboration
- Auth (register / login / logout) with admin panel
- Diagram CRUD with auto-save
- Live presence — cursors, user list, viewport follow
- Share links with roles (editor / viewer) and expiration
- Guest access via share tokens
- Production deployment via Kamal + Cloudflare Tunnel

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+

### Install & run

```bash
npm install
npm run dev
```

This starts:
- **Frontend** at http://localhost:3000
- **Backend** at http://localhost:4000

### Docker (local dev)

```bash
docker compose up
```

Boots frontend (`localhost:3300`), backend (`localhost:4300`), and PostgreSQL (`localhost:5643`).

### Dev Container

1. Open in VS Code
2. `Dev Containers: Reopen in Container`
3. `npm run dev`

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both services |
| `npm run dev:frontend` | Frontend only |
| `npm run dev:backend` | Backend only |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run build` | Production build |

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/auth/me` | Current user |

## Routes

| Path | Access |
|------|--------|
| `/setup` | First-time admin creation |
| `/login` | Public |
| `/register` | Public |
| `/dashboard` | Authenticated |
| `/board/:id` | Authenticated |
| `/settings` | Authenticated |
| `/admin` | Admin only |
| `/share/:token` | Public (via share link) |

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + React Router |
| Editor | Excalidraw |
| Backend | Express + Socket.IO |
| Database | PostgreSQL |
| Deployment | Kamal + Cloudflare Tunnel |
| CI | GitHub Actions |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full feature plan.

## Branding

See [docs/branding/BRANDING.md](docs/branding/BRANDING.md) for the brand guide, assets, and design tokens.

---

<p align="center">
  <sub>Built by <a href="https://github.com/rodacato">@rodacato</a> — an indie builder who'd rather self-host than subscribe.</sub>
</p>

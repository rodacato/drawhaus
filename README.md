# Drawhaus

Self-hosted collaborative whiteboard MVP (Excalidraw-based) built with an AI-first workflow.

## Getting Started

### Prerequisites
- Node.js 22+
- npm 10+

### Install dependencies

```bash
npm install
```

### Run locally (both services)

```bash
npm run dev
```

This starts:
- **Frontend** (Next.js) at http://localhost:3000
- **Backend** (Express) at http://localhost:4000

### Run services individually

```bash
npm run dev:frontend   # Next.js only
npm run dev:backend    # Express only
```

### Current backend API

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Current frontend routes

- `/login`
- `/register`
- `/dashboard` (protected)

### Lint

```bash
npm run lint
```

### Type-check

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### CI Expectations

On every PR (and pushes to `master`/`main`), GitHub Actions runs:
- install (`npm ci`)
- lint (`npm run lint`)
- typecheck (`npm run typecheck`)
- backend tests (`npm run test --workspace=backend`)
- build (`npm run build`)

PRs should only be merged when CI is green.

### Docker (local dev)

```bash
docker compose up
```

This boots:
- Frontend on `http://localhost:3300`
- Backend on `http://localhost:4300`
- PostgreSQL on `localhost:5643` (`drawhaus/drawhaus`)

### Dev Container (recommended for consistent setup)

1. Open this repo in VS Code.
2. Run `Dev Containers: Reopen in Container`.
3. Wait for the post-install script to finish (`.devcontainer/post-install.sh`).
4. Start both apps:

```bash
npm run dev
```

Inside the container:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: `db:5432` (also forwarded to localhost:5432)

---

## Goal
Build a working MVP mainly for personal use, friends, and coworkers, with minimal manual coding.

## Core Stack (Planned)
- Next.js 14 (frontend) — `frontend/`
- Express + Socket.IO (backend) — `backend/`
- PostgreSQL (database)
- Docker Compose + Caddy (deployment)
- GitHub Actions (CI/CD automation)

Reference architecture and implementation details: [BUILD-YOUR-OWN.md](/Users/rodacato/Workspace/rodacato/drawhaus/BUILD-YOUR-OWN.md)

## How AI Should Operate In This Repo
- Primary behavior and decision style: [IDENTITY.md](/Users/rodacato/Workspace/rodacato/drawhaus/IDENTITY.md)
- Multi-perspective advice and debate: [EXPERTS.md](/Users/rodacato/Workspace/rodacato/drawhaus/EXPERTS.md)
- Agent operating rules: [AGENTS.md](/Users/rodacato/Workspace/rodacato/drawhaus/AGENTS.md)

When in doubt, or when requested, use the expert panel to get recommendations, risks, and fallback plans before implementing.

## MVP Scope (Initial)
- Auth (register/login/logout/me)
- Diagram CRUD
- Board editor page with autosave
- Basic real-time collaboration via rooms
- Share link (read-only)
- Dockerized local development

## Delivery Workflow (Low-Touch)
1. Create GitHub Issue for each feature/bug.
2. Define acceptance criteria and test steps in the issue.
3. Use Copilot agents to implement issue-scoped PRs.
4. Run GitHub Actions for validation on every PR.
5. Merge small PRs after CI passes.

## Suggested GitHub Project Setup
- Labels: `mvp`, `backend`, `frontend`, `realtime`, `security`, `infra`, `docs`
- Milestones: `P0-MVP`, `P1-Collab`, `P2-Polish`
- Issue template fields:
  - problem,
  - scope,
  - acceptance criteria,
  - out of scope,
  - test plan.

## Principles
- Keep it simple and shippable.
- Prefer proven patterns over novelty.
- Protect auth and permissions in every API/socket path.
- Document decisions briefly and move forward.

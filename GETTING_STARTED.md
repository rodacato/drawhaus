# Getting Started

Run Drawhaus locally. For the architecture and the full environment-variable reference, see
the [README](README.md#environment-variables); for deployment, [README → Deployment](README.md#deployment).

The backend creates its database schema on first boot — there's no manual migrate step. Every
integration (Google/GitHub login, email, Sentry) is optional; the defaults in `.env.example`
run out of the box. The one required-for-real step is creating the first admin (a setup wizard
walks you through it on first visit).

## Prerequisites

- **Docker** (for the Compose / Dev Container paths), or
- **Node.js ≥ 24** (see `.nvmrc`) + **PostgreSQL 16** (for the bare-metal path)

## Path 1 — Docker Compose (recommended)

Runs the whole stack — frontend, backend, PostgreSQL, and Redis — with hot reload. No local
toolchain beyond Docker.

```bash
git clone https://github.com/rodacato/drawhaus.git
cd drawhaus
cp .env.example .env      # optional — defaults work; edit to add OAuth keys, etc.
docker compose up
```

Open **`http://localhost:5173`**. The Vite dev server proxies `/api` and `/socket.io` to the
backend, so `:5173` is the only URL you need. (The backend is also exposed directly on
`:4300` → internal `4000`; Postgres on `:5643`, Redis on `:6479`.)

## Path 2 — Dev Container

1. Open the folder in VS Code and run **Dev Containers: Reopen in Container**.
2. `npm run dev`

Includes Node 24, the PostgreSQL client, and forwarded ports.

## Path 3 — Bare metal

Requires Node ≥ 24 and a PostgreSQL 16 reachable on `localhost` (Redis optional — without it
the backend uses an in-memory Socket.IO adapter).

```bash
git clone https://github.com/rodacato/drawhaus.git
cd drawhaus
bin/setup        # copies .env, installs dependencies
npm run dev
```

Open **`http://localhost:5173`** (backend on `:4000`). If your Postgres isn't at the default
`postgres://drawhaus:drawhaus@localhost:5432/drawhaus`, edit `DATABASE_URL` in `.env`.

## First run

On first visit you're redirected to `/setup` to create the first admin account. After that you
can sign in with that account; Google/GitHub login appear only if you set their OAuth keys.

## Enabling social login (optional)

Login works with the local admin account out of the box. To add Google or GitHub sign-in, set
the matching keys in `.env` (see the commented blocks in `.env.example`):

- **Google:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
- **GitHub:** `GH_CLIENT_ID` / `GH_CLIENT_SECRET` — [github.com/settings/developers](https://github.com/settings/developers) (the `GH_` prefix is deliberate — GitHub reserves `GITHUB_`)

## First-run check

1. `docker compose up` (or `npm run dev`) shows both `fe` and `be` starting.
2. `http://localhost:5173` loads and redirects to `/setup` on a fresh database.
3. After creating the admin, the dashboard loads.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED :5432` on `npm run dev` | No PostgreSQL running. Use Path 1 (Compose), or start your own PG and point `DATABASE_URL` at it. |
| Backend calls fail when hitting `:4000` directly under Compose | Compose maps the backend to `:4300` (internal `4000`). Use `:5173` — the Vite proxy routes `/api` for you. |
| Real-time sync lost across multiple backend instances | Set `REDIS_URL`; the in-memory adapter is single-instance only. |

## More

[README](README.md) · [README → Environment Variables](README.md#environment-variables) ·
[README → Deployment](README.md#deployment)

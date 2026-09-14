# Deploy with Kamal + GitHub Actions

Zero-downtime deploys via Kamal, run only by GitHub Actions. `master` is the only source of what ships; `production` is a pointer that moves forward by fast-forward, and every push to it deploys.

---

## Architecture

```
git push origin origin/master:production
    ↓
GitHub Actions (.github/workflows/deploy.yml)
    ↓
Guard: the commit must already be on master
    ↓
kamal deploy: build → push to ghcr.io → deploy to the VPS
    ↓
Production ✓
```

**Images built:**

| Image                               | Source                     | Tags              | Purpose                           |
| ----------------------------------- | -------------------------- | ----------------- | --------------------------------- |
| `ghcr.io/<owner>/drawhaus-backend`  | `apps/backend/Dockerfile`  | `<sha>`, `latest` | Express API + Socket.IO (Node.js) |
| `ghcr.io/<owner>/drawhaus-frontend` | `apps/frontend/Dockerfile` | `<sha>`, `latest` | React SPA (nginx)                 |

**Kamal manages on the VPS:**

| Container           | Role                        | Config                       |
| ------------------- | --------------------------- | ---------------------------- |
| `drawhaus-backend`  | Express API (port 4000)     | `config/deploy.backend.yml`  |
| `drawhaus-frontend` | nginx serving SPA (port 80) | `config/deploy.frontend.yml` |
| `drawhaus-postgres` | PostgreSQL 16               | Accessory in backend config  |
| `drawhaus-redis`    | Redis 7 (Socket.IO scaling) | Accessory in backend config  |
| `kamal-proxy`       | Reverse proxy (port 80)     | Managed by Kamal             |

**Deploy order** (enforced by CI job dependencies):

1. Deploy backend: `kamal deploy` builds and pushes the image, then swaps containers behind the `/health` check
2. Deploy frontend: the same, once the backend job succeeds

`kamal deploy` is the only thing that builds and publishes a production image. `docker-build.yml` builds both images on every pull request without pushing, so a broken Dockerfile fails before it merges.

---

## Prerequisites

- VPS with SSH access (Ubuntu 22.04+ recommended)
- Docker installed on the VPS (`curl -fsSL https://get.docker.com | sh`)
- A `deploy` user on the VPS with Docker access (`adduser deploy && usermod -aG docker deploy`)
- GitHub repository with Actions enabled
- Cloudflare Tunnel configured on VPS (handles TLS)

---

## Step 1: Generate Secrets

Run these locally and save the output:

```bash
# Session secret
openssl rand -hex 64

# PostgreSQL password
openssl rand -hex 32

# Encryption key (32-byte hex for AES-256-GCM)
openssl rand -hex 32
```

---

## Step 2: Configure the production environment

Go to **Settings → Environments → production**; both deploy jobs run in it. A **secret** is masked in the Actions logs, a **var** is printed. The repository is public, and so are its logs: anything that identifies the server is a secret, even when it is not sensitive in itself.

| Name                        | Kind   | Required | Value                                                                          |
| --------------------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `HOST_IP`                   | secret | yes      | Server's public IP. Kamal and `ssh-keyscan` print it, so it must be masked     |
| `SSH_PRIVATE_KEY`           | secret | yes      | Private key of the `deploy` user; must match `~/.ssh/authorized_keys` on VPS   |
| `DATABASE_URL`              | secret | yes      | `postgresql://drawhaus:<POSTGRES_PASSWORD>@localhost:5432/drawhaus_production` |
| `POSTGRES_PASSWORD`         | secret | yes      | `openssl rand -hex 32`                                                         |
| `SESSION_SECRET`            | secret | yes      | `openssl rand -hex 64`                                                         |
| `ENCRYPTION_KEY`            | secret | yes      | `openssl rand -hex 32`                                                         |
| `REDIS_URL`                 | secret | yes      | `redis://localhost:6379/0`                                                     |
| `APP_HOST`                  | var    | yes      | Public frontend hostname, no scheme: `draw.example.com`                        |
| `API_HOST`                  | var    | yes      | Public backend hostname, no scheme: `draw-api.example.com`                     |
| `COOKIE_DOMAIN`             | var    | no       | `.example.com` for cross-subdomain cookies; empty otherwise                    |
| `FROM_EMAIL`                | var    | no       | Mail sender; defaults to `noreply@APP_HOST`                                    |
| `RESEND_API_KEY`            | secret | no       | Resend API key; without it emails log to the console                           |
| `GOOGLE_CLIENT_ID`          | var    | no       | Enables Google login                                                           |
| `GOOGLE_CLIENT_SECRET`      | secret | no       | Google OAuth client secret                                                     |
| `GH_CLIENT_ID`              | var    | no       | Enables GitHub login (GitHub reserves the `GITHUB_` prefix)                    |
| `GH_CLIENT_SECRET`          | secret | no       | GitHub OAuth client secret                                                     |
| `METRICS_ENABLED`           | var    | no       | `true` exposes `/metrics`; defaults to `false`                                 |
| `METRICS_TOKEN`             | secret | no       | Bearer token for `/metrics`; required when metrics are enabled                 |
| `SENTRY_DSN`                | secret | no       | Backend Sentry DSN                                                             |
| `SENTRY_ENVIRONMENT`        | var    | no       | Defaults to `production`                                                       |
| `SENTRY_TRACES_SAMPLE_RATE` | var    | no       | Defaults to `0`                                                                |
| `VITE_SENTRY_DSN`           | secret | no       | Frontend Sentry DSN, baked into the build                                      |
| `VITE_SENTRY_ENVIRONMENT`   | var    | no       | Defaults to `SENTRY_ENVIRONMENT`, then `production`                            |
| `SENTRY_AUTH_TOKEN`         | secret | no       | Source-map upload during the frontend build                                    |
| `SENTRY_ORG`                | var    | no       | Sentry organization for the source-map upload                                  |
| `SENTRY_PROJECT`            | var    | no       | Defaults to `drawhaus-frontend`                                                |
| `VITE_GOOGLE_API_KEY`       | var    | no       | Google API key for the frontend                                                |
| `DOCKERHUB_USERNAME`        | var    | no       | Logs in to Docker Hub before building, against base-image pull limits          |
| `DOCKERHUB_TOKEN`           | secret | no       | Docker Hub token, used with `DOCKERHUB_USERNAME`                               |

GitHub resolves each name on the environment first and the repository second, so a repository-level value also works; keep deploy values on the environment.

Not configured anywhere: `KAMAL_REGISTRY_PASSWORD` is the workflow's own `GITHUB_TOKEN`; `GITHUB_REPOSITORY_OWNER` and `GITHUB_ACTOR` are set by the runner; `SENTRY_RELEASE` and the image's `GIT_COMMIT` come from the commit SHA.

`APP_HOST` and `API_HOST` are required and have no default: `config/deploy.*.yml` refuses to render without a bare hostname, and the workflow stops before Kamal runs. Every public URL derives from them — Kamal's proxy hosts, `FRONTEND_URL`, `VITE_API_URL` / `VITE_WS_URL`, the OAuth redirect URIs (`https://API_HOST/api/auth/{google,github}/callback`) and the default mail sender.

> **Important:** `DATABASE_URL` must use the same password as `POSTGRES_PASSWORD`.

---

## Step 3: Cloudflare Tunnel

Make sure the tunnel routes traffic to kamal-proxy:

```yaml
# ~/.cloudflared/config.yml (on VPS)
tunnel: <your-tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  # Both APP_HOST and API_HOST; kamal-proxy routes based on Host header
  - hostname: draw.example.com
    service: http://localhost:80

  - hostname: draw-api.example.com
    service: http://localhost:80

  - service: http_status:404
```

After editing, restart cloudflared:

```bash
sudo systemctl restart cloudflared
```

> **Trusted proxies.** The backend trusts exactly two proxy hops — cloudflared and kamal-proxy
> (`apps/backend/src/infrastructure/http/trust-proxy.ts`) — so `req.ip` is the real client and rate
> limits apply per client. That holds only while kamal-proxy's port 80 is **not** reachable from the
> internet: cloudflared reaches it on `localhost:80`, and a client able to connect there directly could
> forge `X-Forwarded-For`. Adding another proxy in front changes the hop count.

---

## Step 4: First Deploy (setup)

On a new host, open **Actions → Deploy → Run workflow**, pick `master`, and set `action` to `setup`. `kamal setup` installs Docker if needed, starts kamal-proxy, boots the accessories (PostgreSQL 16, Redis 7), and then builds, pushes and deploys the backend; the frontend job runs `setup` against the same host after it.

**Emergency only: from a host shell.** If Actions is unavailable, the same commands run from a machine with Kamal 2.12.0 (the `KAMAL_VERSION` in `deploy.yml`), SSH access as `deploy`, and every name in `.kamal/secrets` exported. A name missing from the environment resolves to an empty string without any error, so check the list before running:

```bash
export HOST_IP=<your-vps-ip> APP_HOST=draw.example.com API_HOST=draw-api.example.com
export GITHUB_REPOSITORY_OWNER=<owner> GITHUB_ACTOR=<owner>
export KAMAL_REGISTRY_PASSWORD=<a token with write:packages>
export DATABASE_URL=... POSTGRES_PASSWORD=... SESSION_SECRET=... ENCRYPTION_KEY=... REDIS_URL=...
# ...and every other name in .kamal/secrets

kamal setup -c config/deploy.backend.yml
kamal setup -c config/deploy.frontend.yml
```

### Verify

```bash
# Backend health check
curl https://$API_HOST/health

# Version info
curl https://$API_HOST/api/version

# Frontend
curl -I https://$APP_HOST
```

---

## Step 5: Deploying

A deploy is promoting `master` to `production`:

```bash
git fetch origin && git push origin origin/master:production
```

Without `--force`, git rejects any push that is not a fast-forward, so `production` only ever moves to a commit that is already on `master`. The workflow checks the same thing on its own: its first step compares the commit with `master` and stops unless it is identical or behind, so a **Run workflow** from any other branch fails before Kamal starts.

**Run workflow** on `master` with `action` set to `deploy` or `redeploy` deploys the head of `master` without moving `production`. Prefer the push, so the branch keeps recording what runs.

### Hotfix

There is no path straight to `production`. Fix on a branch, open a pull request to `master`, merge it once the checks pass, and promote as above.

---

## Common Operations

### From the devcontainer

The devcontainer ships Kamal and can run the _read-only_ commands below without holding a
single production secret. Copy the example file once and set the server address:

```bash
cp .devcontainer/local.env.example .devcontainer/local.env
$EDITOR .devcontainer/local.env      # set HOST_IP, APP_HOST and API_HOST; the file is gitignored
```

`.devcontainer/kamal-env.sh` is sourced by every shell and supplies those three from that
file — what GitHub Actions supplies for free in CI. Without it the ERB in
`config/deploy.*.yml` renders empty and Kamal aborts before it reaches the server.

Available, since these only read: `kamal config`, `kamal app details`, `kamal app logs`,
`kamal app versions`, `kamal accessory details`, `kamal audit`.

Not available, because they need the secrets in `.kamal/secrets` or a local Docker daemon:
`deploy`, `rollback`, `build`, `env push`, and the interactive aliases (`shell`, `db`,
`redis`). Run those from the host, or deploy through GitHub Actions as usual.

### View logs

```bash
kamal app logs -f -c config/deploy.backend.yml      # Backend logs
kamal app logs -f -c config/deploy.frontend.yml      # Frontend logs
kamal accessory logs postgres -c config/deploy.backend.yml  # Database logs
kamal accessory logs redis -c config/deploy.backend.yml     # Redis logs
```

### Database operations

Migrations run on every backend boot, after an automatic pre-migration backup, so a deploy applies them; there is no separate step.

```bash
# On-demand backup into the drawhaus-backups volume, with the retention set in Site Settings
kamal app exec --reuse 'node dist/scripts/db-backup.js' -c config/deploy.backend.yml

# Plain SQL dump to your machine
kamal accessory exec postgres --reuse --raw \
  'pg_dump -U drawhaus drawhaus_production' \
  -c config/deploy.backend.yml > backup.sql
```

`--reuse` runs the command in the container already up on the server, so it needs no registry login, and `--raw` keeps Kamal's log prefixes out of the dump.

### Rollback

```bash
kamal app versions -c config/deploy.backend.yml    # List deployed versions
kamal rollback <version> -c config/deploy.backend.yml
```

### Reboot accessories

```bash
kamal accessory reboot postgres -c config/deploy.backend.yml
kamal accessory reboot redis -c config/deploy.backend.yml
```

### App details

```bash
kamal app details -c config/deploy.backend.yml
kamal app details -c config/deploy.frontend.yml
```

---

## Key Config Files

| File                           | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `config/deploy.backend.yml`    | Kamal config for backend (includes accessories) |
| `config/deploy.frontend.yml`   | Kamal config for frontend                       |
| `.kamal/secrets`               | Secret env var references                       |
| `.github/workflows/deploy.yml` | CI/CD deploy workflow                           |
| `.github/workflows/ci.yml`     | CI tests (runs on PRs and master)               |
| `apps/backend/Dockerfile`      | Backend multi-stage build                       |
| `apps/frontend/Dockerfile`     | Frontend multi-stage build (nginx)              |

---

## Environment Variables

### Backend (clear)

| Variable                                  | Value                                                      | Description         |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------- |
| `PORT`                                    | `4000`                                                     | Express server port |
| `NODE_ENV`                                | `production`                                               | Environment mode    |
| `FILES_PATH`                              | `/data/files`                                              | Upload storage path |
| `FRONTEND_URL`                            | `https://APP_HOST`                                         | Public frontend URL |
| `GH_REDIRECT_URI` / `GOOGLE_REDIRECT_URI` | `https://API_HOST/api/auth/{github,google}/callback`       | OAuth callbacks     |
| `FROM_EMAIL`                              | the `FROM_EMAIL` variable, or empty for `noreply@APP_HOST` | Mail sender         |

### Backend (secret)

Defined in `.kamal/secrets` and injected from the production environment. See Step 2 for the full list.

### Frontend (build args)

| Variable              | Description               |
| --------------------- | ------------------------- |
| `VITE_API_URL`        | `https://API_HOST`        |
| `VITE_WS_URL`         | `https://API_HOST`        |
| `VITE_GOOGLE_API_KEY` | Google API key (optional) |

These are baked into the frontend at build time via Vite.

---

## Volumes

| Docker Volume         | Mount Point                | Purpose               |
| --------------------- | -------------------------- | --------------------- |
| `drawhaus-uploads`    | `/data/files`              | User file uploads     |
| `drawhaus-backups`    | `/data/backups`            | Database backups      |
| `drawhaus-pgdata`     | `/var/lib/postgresql/data` | PostgreSQL data       |
| `drawhaus-redis-data` | `/data`                    | Redis AOF persistence |

---

## Troubleshooting

### Deploy fails with "permission denied"

Your SSH key doesn't have access. Ensure `SSH_PRIVATE_KEY` corresponds to a public key in `~/.ssh/authorized_keys` on the VPS for the `deploy` user.

### Health check fails

The backend health check hits `/health` which verifies the DB connection. Check:

```bash
kamal app logs -c config/deploy.backend.yml
kamal accessory logs postgres -c config/deploy.backend.yml
```

`/health` is rate limited to 120 requests per minute per client. kamal-proxy's check every 10 seconds is
far below that, so a `429` there means something else is polling it.

### Images not found in GHCR

Kamal builds and pushes them in the Deploy workflow's `kamal deploy` step; check that step's log. Images are tagged with the commit SHA and `latest`:

- `ghcr.io/<owner>/drawhaus-backend:latest`
- `ghcr.io/<owner>/drawhaus-frontend:latest`

### Database connection refused

PostgreSQL accessory might not be running:

```bash
kamal accessory details postgres -c config/deploy.backend.yml
kamal accessory boot postgres -c config/deploy.backend.yml
```

### Cloudflare tunnel not routing

```bash
# On VPS
sudo systemctl status cloudflared
curl http://localhost:80  # Test kamal-proxy directly
```

---

## Differences from Docker Compose

| Feature               | Docker Compose | Kamal + CI/CD        |
| --------------------- | -------------- | -------------------- |
| Zero-downtime deploys | No             | Yes                  |
| Automatic on push     | No             | Yes                  |
| Rolling restarts      | No             | Yes                  |
| Health check gating   | No             | Yes                  |
| Setup complexity      | Low            | Medium (one-time)    |
| Rollback              | Manual         | `kamal rollback`     |
| Requires Ruby locally | No             | No, Kamal runs in CI |

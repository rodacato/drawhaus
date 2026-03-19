# Deploy with Kamal + GitHub Actions

Zero-downtime deploys via Kamal, automated through GitHub Actions. Merge to `production`, everything else is automatic.

---

## Architecture

```
Push/merge to production
    ↓
GitHub Actions (.github/workflows/build-push.yml)
    ↓
Docker Build & Push (2 images → ghcr.io)
    ↓
Kamal deploy → VPS
    ↓
Production ✓
```

**Images built:**

| Image | Source | Purpose |
|-------|--------|---------|
| `ghcr.io/rodacato/drawhaus-backend` | `backend/Dockerfile` | Express API + Socket.IO (Node.js) |
| `ghcr.io/rodacato/drawhaus-frontend` | `frontend/Dockerfile` | React SPA (nginx) |

**Kamal manages on the VPS:**

| Container | Role | Config |
|-----------|------|--------|
| `drawhaus-backend` | Express API (port 4000) | `config/deploy.backend.yml` |
| `drawhaus-frontend` | nginx serving SPA (port 80) | `config/deploy.frontend.yml` |
| `drawhaus-postgres` | PostgreSQL 16 | Accessory in backend config |
| `drawhaus-redis` | Redis 7 (Socket.IO scaling) | Accessory in backend config |
| `kamal-proxy` | Reverse proxy (port 80) | Managed by Kamal |

**Deploy order** (enforced by CI job dependencies):
1. Build backend image → push to GHCR
2. Deploy backend via Kamal (with health check gate on `/health`)
3. Build frontend image → push to GHCR (parallel with step 2)
4. Deploy frontend via Kamal (depends on backend deploy + frontend build)

---

## Prerequisites

- VPS with SSH access (Ubuntu 22.04+ recommended)
- Docker installed on the VPS (`curl -fsSL https://get.docker.com | sh`)
- GitHub repository with Actions enabled
- Cloudflare Tunnel configured on VPS (handles TLS)
- Ruby 3.2+ locally (only needed for `kamal setup` — not for CI deploys)

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

## Step 2: Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repo.

### Required Secrets

| Secret | Value | How to generate |
|--------|-------|-----------------|
| `HOST_IP` | Your server's public IP | `curl ifconfig.me` on VPS |
| `SSH_PRIVATE_KEY` | Full SSH private key content | Must match `~/.ssh/authorized_keys` on VPS |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://drawhaus:<POSTGRES_PASSWORD>@localhost:5432/drawhaus_production` |
| `SESSION_SECRET` | 128-char hex string | `openssl rand -hex 64` |
| `POSTGRES_PASSWORD` | 64-char hex string | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 64-char hex string | `openssl rand -hex 32` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `FRONTEND_URL` | Frontend URL | `https://drawhaus.notdefined.dev` |
| `COOKIE_DOMAIN` | Cookie domain (if cross-subdomain) | `.notdefined.dev` or leave empty |
| `HONEYBADGER_API_KEY` | Error monitoring key | From Honeybadger dashboard |
| `RESEND_API_KEY` | Email service key | From Resend dashboard *(optional)* |
| `FROM_EMAIL` | System email sender | `noreply@yourdomain.com` *(optional)* |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | *(optional, enables Google login)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | *(optional)* |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | *(optional)* |

> **Note:** `KAMAL_REGISTRY_PASSWORD` uses `GITHUB_TOKEN` automatically — no PAT needed.

### Required Variables (not secrets)

Go to **Settings → Secrets and variables → Actions → Variables tab**.

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_API_URL` | Backend API URL | `https://drawhaus-api.notdefined.dev` |
| `VITE_WS_URL` | WebSocket URL | `wss://drawhaus-api.notdefined.dev` |
| `VITE_GOOGLE_API_KEY` | Google API key for frontend | *(optional)* |

> **Important:** `DATABASE_URL` must use the same password as `POSTGRES_PASSWORD`.

---

## Step 3: Cloudflare Tunnel

Make sure the tunnel routes traffic to kamal-proxy:

```yaml
# ~/.cloudflared/config.yml (on VPS)
tunnel: <your-tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  # Both drawhaus.notdefined.dev and drawhaus-api.notdefined.dev
  # kamal-proxy routes based on Host header
  - hostname: drawhaus.notdefined.dev
    service: http://localhost:80

  - hostname: drawhaus-api.notdefined.dev
    service: http://localhost:80

  - service: http_status:404
```

After editing, restart cloudflared:

```bash
sudo systemctl restart cloudflared
```

---

## Step 4: First Deploy (kamal setup)

The first deploy must be run manually to install Docker, kamal-proxy, and boot accessories.

```bash
# On your local machine
gem install kamal

# Export all secrets as environment variables
export HOST_IP=<your-vps-ip>
export KAMAL_REGISTRY_PASSWORD=<your-github-pat>
export DATABASE_URL=postgresql://drawhaus:<password>@localhost:5432/drawhaus_production
export SESSION_SECRET=<generated>
export POSTGRES_PASSWORD=<generated>
export ENCRYPTION_KEY=<generated>
export REDIS_URL=redis://localhost:6379/0
export FRONTEND_URL=https://drawhaus.notdefined.dev
# ... (all other secrets from .kamal/secrets)

# Setup backend (boots postgres + redis accessories)
kamal setup -c config/deploy.backend.yml

# Setup frontend
kamal setup -c config/deploy.frontend.yml
```

This will:
1. Install Docker on the VPS (if needed)
2. Start kamal-proxy (reverse proxy on port 80)
3. Boot accessories: PostgreSQL 16, Redis 7
4. Build and push Docker images
5. Deploy backend and frontend containers
6. Run health checks to verify

### Verify

```bash
# Backend health check
curl https://drawhaus-api.notdefined.dev/health

# Version info
curl https://drawhaus-api.notdefined.dev/api/version

# Frontend
curl -I https://drawhaus.notdefined.dev
```

---

## Step 5: Automatic Deploys (CI/CD)

After the first setup, every push to `production` triggers automatic deployment:

```bash
git checkout production
git merge master
git push origin production
```

The workflow (`.github/workflows/build-push.yml`) handles everything:
1. Builds backend image → pushes to GHCR
2. Deploys backend via Kamal (boots accessories if needed)
3. Builds frontend image → pushes to GHCR (parallel)
4. Deploys frontend via Kamal (waits for backend health check)

No manual steps needed after the initial setup.

---

## Common Operations

### View logs

```bash
kamal app logs -f -c config/deploy.backend.yml      # Backend logs
kamal app logs -f -c config/deploy.frontend.yml      # Frontend logs
kamal accessory logs postgres -c config/deploy.backend.yml  # Database logs
kamal accessory logs redis -c config/deploy.backend.yml     # Redis logs
```

### Database operations

```bash
# Run migrations
kamal app exec 'node dist/migrations/run.js' -c config/deploy.backend.yml

# Database backup
kamal accessory exec postgres \
  'pg_dump -U drawhaus drawhaus_production' \
  -c config/deploy.backend.yml > backup.sql

# Or use the built-in backup system
kamal app exec 'npm run db:backup' -c config/deploy.backend.yml
```

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

| File | Purpose |
|------|---------|
| `config/deploy.backend.yml` | Kamal config for backend (includes accessories) |
| `config/deploy.frontend.yml` | Kamal config for frontend |
| `.kamal/secrets` | Secret env var references |
| `.github/workflows/build-push.yml` | CI/CD deploy workflow |
| `.github/workflows/ci.yml` | CI tests (runs on PRs and master) |
| `backend/Dockerfile` | Backend multi-stage build |
| `frontend/Dockerfile` | Frontend multi-stage build (nginx) |

---

## Environment Variables

### Backend (clear)

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `4000` | Express server port |
| `NODE_ENV` | `production` | Environment mode |
| `FILES_PATH` | `/data/files` | Upload storage path |

### Backend (secret)

Defined in `.kamal/secrets` and injected via GitHub Actions secrets. See Step 2 for the full list.

### Frontend (build args)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_WS_URL` | WebSocket connection URL |
| `VITE_GOOGLE_API_KEY` | Google API key (optional) |

These are baked into the frontend at build time via Vite.

---

## Volumes

| Docker Volume | Mount Point | Purpose |
|---------------|-------------|---------|
| `drawhaus-uploads` | `/data/files` | User file uploads |
| `drawhaus-backups` | `/data/backups` | Database backups |
| `drawhaus-pgdata` | `/var/lib/postgresql/data` | PostgreSQL data |
| `drawhaus-redis-data` | `/data` | Redis AOF persistence |

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

### Images not found in GHCR

Check that the build jobs succeeded in GitHub Actions. Images should be at:
- `ghcr.io/rodacato/drawhaus-backend:latest`
- `ghcr.io/rodacato/drawhaus-frontend:latest`

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

| Feature | Docker Compose | Kamal + CI/CD |
|---------|---------------|---------------|
| Zero-downtime deploys | No | Yes |
| Automatic on push | No | Yes |
| Rolling restarts | No | Yes |
| Health check gating | No | Yes |
| Setup complexity | Low | Medium (one-time) |
| Rollback | Manual | `kamal rollback` |
| Requires Ruby locally | No | Only for first setup |

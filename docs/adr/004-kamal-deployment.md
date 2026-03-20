# ADR-004: Kamal for Production Deployment

**Status:** accepted
**Date:** 2026-01-20

## Context

The project needed a deployment strategy for a single VPS. Options ranged from raw Docker Compose to managed platforms.

## Decision

Use **Kamal** (from 37signals) for zero-downtime deploys to a single VPS via GitHub Actions.

## Alternatives Considered

- **Docker Compose only** — rejected: no zero-downtime deploys, no rolling restarts, manual process.
- **Kubernetes** — rejected: massive overkill for a single-server personal tool.
- **Coolify / CapRover** — rejected: extra abstraction layer with less control.

## Consequences

- Backend and frontend deploy as separate Kamal services.
- PostgreSQL runs as a Kamal accessory with persistent volumes.
- GitHub Actions workflow: build images → push to GHCR → deploy via Kamal.
- Cloudflare Tunnel provides TLS and DDoS protection without exposing ports.
- Rollbacks via `kamal rollback` are fast and safe.
- Deploy config lives in `config/deploy.*.yml`.

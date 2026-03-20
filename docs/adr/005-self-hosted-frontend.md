# ADR-005: Self-Hosted Frontend over Cloudflare Pages

**Status:** accepted
**Date:** 2026-03-09

## Context

The frontend was initially deployed to Cloudflare Pages with the API on a VPS. This caused cross-origin cookie issues (`SameSite`, third-party cookie restrictions) and required `COOKIE_DOMAIN` configuration.

## Decision

Deploy the frontend as a **Kamal service** (nginx container) on the same server as the backend. Remove Cloudflare Pages dependency.

**Supersedes:** The earlier decision to use Cloudflare Pages for same-parent-domain cookies.

## Alternatives Considered

- **Keep Cloudflare Pages** — rejected: cross-origin cookie complexity, third-party cookie deprecation risk, split deployment adds fragility.
- **Serve SPA from Express** — rejected: mixing static file serving with API concerns.

## Consequences

- Same-origin deployment: cookies use `SameSite=lax` (more secure).
- `COOKIE_DOMAIN` env var only needed for cross-subdomain setups.
- Frontend nginx container with gzip, immutable asset caching, SPA fallback.
- Single `docker compose up` runs everything including the frontend.
- Sequential deploy in CI: backend first (with health check gate), then frontend.

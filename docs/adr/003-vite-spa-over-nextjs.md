# ADR-003: Vite SPA over Next.js

**Status:** accepted
**Date:** 2026-02-20

## Context

The frontend was originally built with Next.js App Router. After evaluating the actual needs, no feature required SSR — the app is a dashboard + editor behind auth, not a content site.

## Decision

Migrate to **Vite + React Router** as a static SPA. Serve via nginx in production.

## Alternatives Considered

- **Keep Next.js** — rejected: SSR overhead, complex deployment (needs Node runtime), App Router complexity for a fully client-side app.
- **Remix** — rejected: same SSR overhead problem, no benefit for this use case.

## Consequences

- Simpler deployment: static files served by nginx with immutable asset caching.
- Frontend Dockerfile is a multi-stage build → tiny nginx image.
- Client-side routing with React Router; nginx `try_files` handles SPA fallback.
- Axios API layer with typed endpoint modules replaces Next.js data fetching.
- Response interceptor handles 401 redirects and auto-unwraps `.data`.
- Removed `next`, `eslint-config-next`, and all related dependencies.

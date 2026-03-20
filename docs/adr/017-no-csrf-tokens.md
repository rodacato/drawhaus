# ADR-017: No CSRF Tokens

**Status:** accepted
**Date:** 2026-03-13

## Context

Traditional CSRF protection uses tokens in forms/headers. Drawhaus is a SPA that communicates with its API via Axios with `withCredentials: true`.

## Decision

Skip CSRF tokens. Rely on **SameSite=Lax cookies + CORS origin lock + httpOnly cookies** for CSRF protection.

## Alternatives Considered

- **Double-submit cookie pattern** — rejected: adds complexity (token generation, header injection, validation middleware) without meaningful security gain given the existing protections.
- **Synchronizer token pattern** — rejected: designed for server-rendered forms, not SPAs.

## Consequences

- No CSRF middleware or token management.
- `SameSite=Lax` prevents cross-site cookie sending for most attack vectors.
- CORS `origin` check blocks requests from unauthorized origins.
- `httpOnly` cookies prevent JavaScript access to session tokens.
- Security relies on the combination of all three controls — removing any one would require revisiting this decision.

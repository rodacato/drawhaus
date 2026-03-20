# ADR-011: API Namespace Separation (/api/ vs /v1/)

**Status:** accepted
**Date:** 2026-03-14

## Context

Drawhaus needed both an internal API (used by the SPA) and a public API (used by external clients, MCP server). These have different auth mechanisms and rate limits.

## Decision

Separate namespaces:
- `/api/` — internal, authenticated via session cookies.
- `/v1/` — public, authenticated via API keys (`dhk_` prefix, SHA-256 hashed).

Require `X-Drawhaus-Client` header on `/v1/` requests for client identification.

## Alternatives Considered

- **Single namespace with dual auth** — rejected: mixing cookie and API key auth in the same middleware is error-prone.
- **Separate service for public API** — rejected: overkill for a personal tool; adds deployment complexity.

## Consequences

- Clear separation of concerns: internal routes don't need API key logic, public routes don't need session logic.
- API keys are workspace-scoped with per-key rate limiting (60 req/min).
- Request logging per API key for abuse detection.
- OpenAPI 3.1 spec covers only `/v1/` endpoints.
- MCP server and future CLI use `/v1/` exclusively.

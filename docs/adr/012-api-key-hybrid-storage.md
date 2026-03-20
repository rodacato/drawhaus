# ADR-012: API Key Hybrid Storage (env + DB)

**Status:** accepted
**Date:** 2026-03-14

## Context

Drawhaus stores two kinds of secrets: infrastructure secrets (DB credentials, session secret) and feature secrets (Google OAuth, Resend, API keys). These have different lifecycle and management needs.

## Decision

**Hybrid approach:**
- Infrastructure secrets → environment variables (required at boot).
- Feature/integration secrets → encrypted in database (AES-256-GCM), manageable via admin UI.

API keys specifically: stored as SHA-256 hashes in the database. The raw key is shown only once at creation time.

## Alternatives Considered

- **All secrets in env vars** — rejected: requires server access to configure Google OAuth, Resend, etc. Admin UI can't manage them.
- **All secrets in DB** — rejected: boot dependencies (DB password, encryption key) can't come from the DB they're connecting to.
- **Vault/external secret manager** — rejected: enterprise complexity for a personal tool.

## Consequences

- Setup wizard configures feature secrets without server access.
- `ENCRYPTION_KEY` (32-byte hex) is the single env var needed for secret encryption.
- Integration secrets (Google, Resend, Honeybadger) editable from admin UI.
- API keys use SHA-256 hashing (not encryption) — lookup by hash, not reversible.
